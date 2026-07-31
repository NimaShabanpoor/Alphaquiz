import {
  attemptCookieName,
  isAttemptAccessTokenValid,
  readRequestCookie,
} from "@/lib/exam-access";
import {
  loadExamSourceByPublicationId,
  toPublicExamAttempt,
  toPublicExamMetadata,
} from "@/lib/exam-data";
import {
  expireAttemptIfNeeded,
  finalizeStoredAttempt,
  loadStoredAttempt,
  recordViolation,
  validateExamResponse,
} from "@/lib/public-exam-service";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

type UpdateBody = {
  currentQuestion?: number;
  questionId?: string;
  response?: string[];
  eventType?: "tab-hidden" | "fullscreen-exit";
};

async function authorizeAttempt(request: Request, attemptId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase.client) {
    return { error: "Die Prüfungsplattform ist nicht konfiguriert.", status: 503 };
  }
  const stored = await loadStoredAttempt(supabase.client, attemptId);
  if (!stored) {
    return { error: "Der Prüfungsversuch wurde nicht gefunden.", status: 404 };
  }
  const accessTokenHash = String(stored.attempt.accessTokenHash ?? "");
  const token = readRequestCookie(request, attemptCookieName(attemptId));
  if (
    !token ||
    !accessTokenHash ||
    !isAttemptAccessTokenValid(token, accessTokenHash)
  ) {
    return { error: "Der Zugriff auf diesen Versuch ist nicht erlaubt.", status: 401 };
  }
  const source = await loadExamSourceByPublicationId(
    supabase.client,
    String(stored.attempt.publicationId),
  );
  if (!source) {
    return { error: "Die zugehörige Prüfung wurde nicht gefunden.", status: 404 };
  }
  const attempt = await expireAttemptIfNeeded(
    supabase.client,
    stored.attempt,
    stored.instance,
    source.publication.timeLimit,
  );
  return {
    client: supabase.client,
    source,
    attempt,
    instance: stored.instance,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { attemptId } = await context.params;
    const authorized = await authorizeAttempt(request, attemptId);
    if ("error" in authorized) {
      return Response.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }
    return Response.json({
      exam: toPublicExamMetadata(authorized.source),
      attempt: toPublicExamAttempt(
        authorized.attempt,
        authorized.instance,
      ),
    });
  } catch {
    return Response.json(
      {
        error: "Der Versuch konnte nicht geladen werden.",
      },
      { status: 502 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { attemptId } = await context.params;
    const authorized = await authorizeAttempt(request, attemptId);
    if ("error" in authorized) {
      return Response.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }
    if (authorized.attempt.status !== "in-progress") {
      return Response.json({
        exam: toPublicExamMetadata(authorized.source),
        attempt: toPublicExamAttempt(
          authorized.attempt,
          authorized.instance,
        ),
      });
    }

    const body = (await request.json()) as UpdateBody;
    let updatedAttempt = authorized.attempt;

    if (body.eventType) {
      if (authorized.source.publication.mode !== "closed") {
        return Response.json(
          { error: "Open-Book-Prüfungen protokollieren keine Tabwechsel." },
          { status: 400 },
        );
      }
      const violation = await recordViolation(
        authorized.client,
        attemptId,
        authorized.source.publication.id,
        body.eventType,
        authorized.source.publication.maxViolations,
      );
      const nextStored = await loadStoredAttempt(authorized.client, attemptId);
      updatedAttempt = nextStored?.attempt ?? updatedAttempt;
      if (violation && "shouldTerminate" in violation && violation.shouldTerminate) {
        updatedAttempt = await finalizeStoredAttempt(
          authorized.client,
          updatedAttempt,
          authorized.instance,
          "terminated",
        );
      }
    } else {
      const patch: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      if (body.questionId !== undefined) {
        const validated = validateExamResponse(
          authorized.instance,
          body.questionId,
          body.response,
        );
        if ("error" in validated) {
          return Response.json({ error: validated.error }, { status: 400 });
        }
        patch.responses = {
          ...((updatedAttempt.responses as Record<string, string[]> | null) ??
            {}),
          [body.questionId]: validated.values,
        };
      }
      if (body.currentQuestion !== undefined) {
        if (!Number.isInteger(body.currentQuestion)) {
          return Response.json(
            { error: "Die Fragenposition ist ungültig." },
            { status: 400 },
          );
        }
        patch.currentQuestion = Math.max(
          0,
          Math.min(
            body.currentQuestion,
            authorized.instance.questions.length - 1,
          ),
        );
      }
      const { data, error } = await authorized.client
        .from("exam_attempts")
        .update(patch)
        .eq("id", attemptId)
        .eq("status", "in-progress")
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) updatedAttempt = data;
    }

    return Response.json({
      exam: toPublicExamMetadata(authorized.source),
      attempt: toPublicExamAttempt(updatedAttempt, authorized.instance),
    });
  } catch {
    return Response.json(
      {
        error: "Der Versuch konnte nicht gespeichert werden.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { attemptId } = await context.params;
    const authorized = await authorizeAttempt(request, attemptId);
    if ("error" in authorized) {
      return Response.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }
    const updatedAttempt =
      authorized.attempt.status === "in-progress"
        ? await finalizeStoredAttempt(
            authorized.client,
            authorized.attempt,
            authorized.instance,
            "submitted",
          )
        : authorized.attempt;
    return Response.json({
      exam: toPublicExamMetadata(authorized.source),
      attempt: toPublicExamAttempt(updatedAttempt, authorized.instance),
    });
  } catch {
    return Response.json(
      {
        error: "Die Prüfung konnte nicht abgegeben werden.",
      },
      { status: 502 },
    );
  }
}
