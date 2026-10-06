import { and, desc, eq, inArray } from "drizzle-orm";
import { CreatePollInput, type ListPollsResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route } from "@/lib/api/http";
import { presentPolls, RESERVED_SLUGS, uniqueSlug, voterIdentity } from "@/lib/api/polls";
import { newQrCode, presentQr } from "@/lib/api/qr";
import { getCurrentUser, isStaff, requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { cleanImage } from "@/lib/privacy/clean-image";
import { download, ownsPath, upload } from "@/lib/storage";

export const GET = route(async () => {
  const user = await getCurrentUser();
  const db = getDb();
  const rows = await db.select().from(schema.polls).orderBy(desc(schema.polls.createdAt));
  let polls = await presentPolls(rows);
  if (!isStaff(user)) polls = polls.filter((p) => p.status !== "draft");

  const { keys } = await voterIdentity(user, false);
  const mine =
    keys.length && polls.length
      ? await db
          .select({ pollId: schema.pollVotes.pollId, choice: schema.pollVotes.choice })
          .from(schema.pollVotes)
          .where(and(inArray(schema.pollVotes.voterKey, keys), inArray(schema.pollVotes.pollId, polls.map((p) => p.id))))
      : [];
  const choiceByPoll = new Map(mine.map((m) => [m.pollId, m.choice]));
  return ok<ListPollsResponse>({ polls: polls.map((p) => ({ ...p, myChoice: choiceByPoll.get(p.id) ?? null })) });
});

export const POST = route(async (req) => {
  const staff = await requireStaff();
  const input = await parseJson(req, CreatePollInput);
  for (const p of [input.optionA.imagePath, input.optionB.imagePath]) {
    if (!ownsPath(staff.id, p) && !p.startsWith("seed/")) throw new HttpError("forbidden", "Upload the images first");
  }
  // Strip EXIF/GPS from staff photos before they're public (seed images are already clean).
  await Promise.all(
    [input.optionA.imagePath, input.optionB.imagePath]
      .filter((p) => !p.startsWith("seed/"))
      .map(async (p) => {
        try {
          await upload("poll-images", p, await cleanImage(await download("poll-images", p)), "image/jpeg");
        } catch {
          throw new HttpError("bad_request", "Could not read one of the images. Please upload a JPEG, PNG or WebP.");
        }
      }),
  );
  const db = getDb();
  if (input.slug) {
    if (RESERVED_SLUGS.has(input.slug)) throw new HttpError("bad_request", "That URL name is reserved");
    const [taken] = await db.select({ id: schema.polls.id }).from(schema.polls).where(eq(schema.polls.slug, input.slug));
    if (taken) throw new HttpError("conflict", "That URL name is already used by another poll");
  }
  const slug = input.slug ?? (await uniqueSlug(input.titleEn || input.titleJa));
  const result = await db.transaction(async (tx) => {
    if (input.featured) await tx.update(schema.polls).set({ featured: false });
    const [poll] = await tx
      .insert(schema.polls)
      .values({
        slug,
        featured: input.featured,
        titleJa: input.titleJa,
        titleEn: input.titleEn,
        questionJa: input.questionJa,
        questionEn: input.questionEn,
        descriptionJa: input.descriptionJa,
        descriptionEn: input.descriptionEn,
        optionAImagePath: input.optionA.imagePath,
        optionALabelJa: input.optionA.labelJa,
        optionALabelEn: input.optionA.labelEn,
        optionBImagePath: input.optionB.imagePath,
        optionBLabelJa: input.optionB.labelJa,
        optionBLabelEn: input.optionB.labelEn,
        placeId: input.placeId,
        status: input.status,
        opensAt: input.opensAt ? new Date(input.opensAt) : null,
        closesAt: input.closesAt ? new Date(input.closesAt) : null,
        resultsVisibility: input.resultsVisibility,
        requireSignIn: input.requireSignIn,
        verifiedOnly: input.verifiedOnly,
        createdBy: staff.id,
      })
      .returning();
    const qr = input.createQr
      ? (
          await tx
            .insert(schema.qrCodes)
            .values({ code: newQrCode(), kind: "link", targetType: "poll", targetId: poll.id, label: input.titleJa, createdBy: staff.id })
            .returning()
        )[0]
      : null;
    await tx.insert(schema.auditLog).values({ actorId: staff.id, action: "poll.create", targetType: "poll", targetId: poll.id });
    return { poll, qr };
  });
  const [poll] = await presentPolls([result.poll]);
  return ok({ poll, qr: result.qr ? presentQr(result.qr) : null }, { status: 201 });
});

