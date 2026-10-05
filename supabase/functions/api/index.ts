import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@3";
import { jwtVerify, SignJWT } from "npm:jose@5";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const jwtSecret = Deno.env.get("JWT_SECRET")!;
const cleanupSecret = Deno.env.get("PHOTO_CLEANUP_SECRET") ?? jwtSecret;
const inviteCode = Deno.env.get("TEACHER_INVITE_CODE") ?? "";
const frontendOrigin = Deno.env.get("FRONTEND_ORIGIN") ??
  "https://ynshruthie.github.io";
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
const jwtKey = new TextEncoder().encode(jwtSecret);
const zone = "Asia/Kolkata";
const maxPhotos = 25;
const startGrace = 15;
const uploadGrace = 15;

const corsHeaders = {
  "Access-Control-Allow-Origin": frontendOrigin,
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-simulated-time",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Vary": "Origin",
};

const respond = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });

const fail = (message: string, status = 400) =>
  respond({ error: message }, status);
const nowParts = () =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((
      { type, value },
    ) => [type, Number(value)]),
  );
const today = () => {
  const p = nowParts();
  return `${p.year}-${String(p.month).padStart(2, "0")}-${
    String(p.day).padStart(2, "0")
  }`;
};
const timeNow = () => {
  const p = nowParts();
  return {
    hhmm: `${String(p.hour).padStart(2, "0")}:${
      String(p.minute).padStart(2, "0")
    }`,
    minutes: p.hour * 60 + p.minute,
  };
};
const dateObj = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    ? new Date(`${value}T00:00:00Z`)
    : null;
const dateString = (d: Date) => d.toISOString().slice(0, 10);
const bookingWeekMonday = (bookingOpen: boolean) => {
  const monday = dateObj(today())!;
  const day = monday.getUTCDay();
  if (day === 0) {
    monday.setUTCDate(monday.getUTCDate() + 1);
  } else if (bookingOpen) {
    monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7));
  } else {
    const daysUntilMonday = (8 - day) % 7 || 7;
    monday.setUTCDate(monday.getUTCDate() + daysUntilMonday);
  }
  return monday;
};
const getWeekDates = (start: Date) =>
  Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return dateString(d);
  });
const hm = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h < 24 && m < 60 ? h * 60 + m : null;
};
const toHm = (total: number) =>
  `${
    String(Math.floor((((total % 1440) + 1440) % 1440) / 60)).padStart(2, "0")
  }:${String(((total % 1440) + 1440) % 60).padStart(2, "0")}`;
const displayHm = (value: string | null) => {
  const mins = hm(value);
  if (mins === null) return value ?? "";
  const h = Math.floor(mins / 60);
  return `${h % 12 || 12}:${String(mins % 60).padStart(2, "0")} ${
    h >= 12 ? "PM" : "AM"
  }`;
};
const timeRange = (start: string | null, end: string | null) =>
  `${displayHm(start)} - ${displayHm(end)}`;
const basePayload = {
  images: [] as string[],
  managerType: "SELF",
  attendanceStatus: "PENDING",
  attendanceMarkedAt: null as string | null,
  bookingConfirmedAt: null as string | null,
  plannedStart: null as string | null,
  plannedEnd: null as string | null,
  actualStart: null as string | null,
  actualEnd: null as string | null,
};
const parsePayload = (raw: unknown) => {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return { ...basePayload, images: parsed };
    if (parsed && typeof parsed === "object") {
      return {
        ...basePayload,
        ...parsed,
        images: Array.isArray(parsed.images) ? parsed.images : [],
      };
    }
  } catch { /* Legacy string values are treated as one image URL. */ }
  return typeof raw === "string" && raw
    ? { ...basePayload, images: [raw] }
    : { ...basePayload };
};
const serializePayload = (p: Record<string, unknown>) =>
  JSON.stringify({
    ...basePayload,
    ...p,
    images: Array.isArray(p.images) ? p.images : [],
  });
const summaryUser = (u: Record<string, unknown>) => ({
  id: u.id,
  student_id: u.student_id,
  name: u.name,
  role: u.role,
});
const issueToken = async (u: Record<string, unknown>) =>
  new SignJWT(summaryUser(u)).setProtectedHeader({ alg: "HS256" }).setIssuedAt()
    .setExpirationTime("30d").sign(jwtKey);
const userFromRequest = async (req: Request) => {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    throw new Response(
      JSON.stringify({
        error: "Access token required",
        code: "AUTH_TOKEN_MISSING",
      }),
      { status: 401 },
    );
  }
  try {
    const { payload } = await jwtVerify(token, jwtKey);
    const { data, error } = await supabase.from("users").select(
      "id, student_id, name, role",
    ).eq("id", payload.id).single();
    if (error || !data) throw new Error("missing");
    return data;
  } catch {
    throw new Response(
      JSON.stringify({
        error: "Your session has expired. Please sign in again.",
        code: "AUTH_TOKEN_INVALID",
      }),
      { status: 401 },
    );
  }
};
const readBody = async (req: Request) =>
  req.headers.get("content-type")?.includes("application/json")
    ? await req.json()
    : {};
const signImages = async (images: string[]) => {
  const paths = images.map((image) => {
    const marker = "/storage/v1/object/public/study-photos/";
    const markerIndex = image.indexOf(marker);
    if (markerIndex < 0) {
      return /^[^/]+\/[0-9a-f-]{36}\.[a-zA-Z0-9]+$/.test(image) ? image : null;
    }
    return decodeURIComponent(
      image.slice(markerIndex + marker.length).split("?")[0],
    );
  });
  const storagePaths = paths.filter((path): path is string => Boolean(path));
  if (!storagePaths.length) return images;
  const { data, error } = await supabase.storage.from("study-photos")
    .createSignedUrls(storagePaths, 60 * 60);
  if (error) throw error;
  let signedIndex = 0;
  return paths.map((path, index) => {
    if (!path) return images[index];
    const signed = data[signedIndex++];
    if (!signed?.signedUrl) {
      throw new Error("Could not create a private photo URL.");
    }
    return signed.signedUrl;
  });
};
const sendHour = async (row: Record<string, any>, current: number) => {
  const p = parsePayload(row.image_url);
  const start = hm(p.plannedStart),
    end = hm(p.plannedEnd),
    actualEnd = hm(p.actualEnd);
  let state = p.attendanceStatus;
  if (
    p.managerType === "SELF" && state === "PENDING" && start !== null &&
    current > start + startGrace
  ) state = "ABSENT";
  const markEnabled = p.managerType === "SELF" && state === "PENDING" &&
    start !== null && current >= start && current <= start + startGrace;
  const uploadOpen = p.managerType === "PARENT" ||
    (state === "PRESENT" && actualEnd !== null && current >= actualEnd &&
      current <= actualEnd + uploadGrace);
  const planned = timeRange(p.plannedStart, p.plannedEnd);
  const active = p.actualStart && p.actualEnd
    ? timeRange(p.actualStart, p.actualEnd)
    : null;
  const imageUrls = await signImages(p.images);
  return {
    id: row.id,
    hour_number: row.hour_number,
    subject: row.subject,
    manager_type: p.managerType,
    time_slot: active || planned,
    scheduled_time_slot: planned,
    active_time_slot: active,
    attendance_status: state,
    attendance_marked_at: p.attendanceMarkedAt,
    booking_confirmed_at: p.bookingConfirmedAt,
    planned_start: p.plannedStart,
    planned_end: p.plannedEnd,
    actual_start: p.actualStart,
    actual_end: p.actualEnd,
    mark_button_enabled: markEnabled,
    start_window_label: start === null
      ? null
      : timeRange(p.plannedStart, toHm(start + startGrace)),
    upload_window_open: uploadOpen,
    upload_window_end: actualEnd === null
      ? null
      : displayHm(toHm(actualEnd + uploadGrace)),
    study_remaining_minutes:
      p.managerType === "SELF" && state === "PRESENT" && actualEnd !== null &&
        current < actualEnd
        ? actualEnd - current
        : null,
    study_warning: actualEnd !== null && current < actualEnd &&
      actualEnd - current <= 15,
    requires_student_attendance: p.managerType === "SELF",
    image_urls: imageUrls,
    image_url: imageUrls[0] || "",
    photo_count: p.images.length,
    created_at: row.created_at,
  };
};
const requireTeacher = (user: Record<string, any>) => user.role === "teacher";
const getMentor = async (value: string) => {
  const id = value?.trim().toUpperCase();
  if (!id) throw new Error("Mentor ID is required.");
  const { data } = await supabase.from("users").select("student_id").ilike(
    "student_id",
    id,
  ).eq("role", "teacher").maybeSingle();
  if (!data) throw new Error(`Mentor ID "${id}" was not found.`);
  return data.student_id;
};
const getBookingOpen = async () => {
  const { data, error } = await supabase.from("booking_settings").select(
    "booking_open",
  ).eq("id", "global").maybeSingle();
  if (error) throw error;
  return !!data?.booking_open;
};

const cleanupExpiredPhotos = async () => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: expired, error } = await supabase.from("study_photo_uploads")
    .select("id, object_path, study_hour_id")
    .lte("uploaded_at", cutoff)
    .order("uploaded_at")
    .limit(500);
  if (error) throw error;
  if (!expired?.length) return { deleted: 0 };

  let deletedCount = 0;
  for (let offset = 0; offset < expired.length; offset += 100) {
    const batch = expired.slice(offset, offset + 100);
    const byHour = new Map<number, string[]>();
    for (const photo of batch) {
      const paths = byHour.get(photo.study_hour_id) ?? [];
      paths.push(photo.object_path);
      byHour.set(photo.study_hour_id, paths);
    }

    let referencesCleared = true;
    for (const [hourId, paths] of byHour) {
      const { data: row, error: rowError } = await supabase.from("study_hours")
        .select("id, image_url")
        .eq("id", hourId)
        .maybeSingle();
      if (rowError) throw rowError;
      if (!row) continue;

      let current = row;
      let saved = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const payload = parsePayload(current.image_url);
        payload.images = payload.images.filter((image: string) =>
          !paths.includes(image) && !paths.some((path) => image.includes(path))
        );
        const { data: updated, error: updateError } = await supabase.from(
          "study_hours",
        )
          .update({ image_url: serializePayload(payload) })
          .eq("id", hourId)
          .eq("image_url", current.image_url)
          .select("id")
          .maybeSingle();
        if (updateError) throw updateError;
        if (updated) {
          saved = true;
          break;
        }
        const { data: latest, error: latestError } = await supabase.from(
          "study_hours",
        )
          .select("id, image_url")
          .eq("id", hourId)
          .maybeSingle();
        if (latestError) throw latestError;
        if (!latest) {
          saved = true;
          break;
        }
        current = latest;
      }
      if (!saved) referencesCleared = false;
    }
    if (!referencesCleared) continue;

    const { error: storageError } = await supabase.storage.from("study-photos")
      .remove(batch.map((photo) => photo.object_path));
    if (storageError) throw storageError;
    const { error: metadataError } = await supabase.from("study_photo_uploads")
      .delete()
      .in("id", batch.map((photo) => photo.id));
    if (metadataError) throw metadataError;
    deletedCount += batch.length;
  }
  return { deleted: deletedCount };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (
    req.headers.get("origin") && req.headers.get("origin") !== frontendOrigin
  ) return fail("Origin not allowed.", 403);
  if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
    return fail("API secrets are not configured.", 500);
  }
  const url = new URL(req.url);
  const path =
    url.pathname.replace(/^\/functions\/v1\/api/, "").replace(/^\/api/, "")
      .replace(/\/$/, "") || "/";
  const method = req.method.toUpperCase();
  try {
    const body = await readBody(req);

    if (method === "GET" && path === "/health") {
      return respond({ status: "ok", time: new Date().toISOString() });
    }
    if (method === "POST" && path === "/maintenance/cleanup") {
      if (
        !cleanupSecret ||
        req.headers.get("authorization") !== `Bearer ${cleanupSecret}`
      ) {
        return fail("Access denied.", 401);
      }
      return respond(await cleanupExpiredPhotos());
    }
    if (method === "POST" && path === "/auth/login") {
      const loginId = String(
        body.student_id || body.teacher_id || body.login_id || "",
      ).trim().toUpperCase();
      if (
        !loginId || !body.password ||
        !["student", "teacher"].includes(body.role)
      ) return fail("ID, password, and valid login role are required.");
      const { data: account, error } = await supabase.from("users").select("*")
        .ilike("student_id", loginId).maybeSingle();
      if (error) throw error;
      if (!account) return fail("Invalid ID or password", 401);
      if (account.role !== body.role) {
        return fail(
          `This account is registered as a ${account.role}. Please use the ${account.role} sign-in.`,
          403,
        );
      }
      const valid = /^\$2[aby]\$/.test(account.password_hash)
        ? await bcrypt.compare(body.password, account.password_hash)
        : body.password === account.password_hash;
      if (!valid) return fail("Invalid ID or password", 401);
      if (!/^\$2[aby]\$/.test(account.password_hash)) {
        await supabase.from("users").update({
          password_hash: await bcrypt.hash(body.password, 10),
        }).eq("id", account.id);
      }
      return respond({
        message: "Login successful",
        token: await issueToken(account),
        user: summaryUser(account),
      });
    }
    if (method === "GET" && path === "/auth/me") {
      return respond({ user: await userFromRequest(req) });
    }
    if (
      method === "POST" &&
      ["/auth/teacher-signup", "/auth/teacher-forgot-password"].includes(path)
    ) {
      if (!inviteCode || body.invite_code !== inviteCode) {
        return fail(
          "Invalid invite code. Please contact the administrator.",
          403,
        );
      }
      const teacherId = String(body.teacher_id || "").trim().toUpperCase();
      if (
        !teacherId || !body.password || body.password.length < 6 ||
        (path.endsWith("signup") && !body.name)
      ) {
        return fail(
          "Teacher details and a password of at least 6 characters are required.",
        );
      }
      if (path.endsWith("signup")) {
        const { data: exists } = await supabase.from("users").select("id")
          .ilike("student_id", teacherId).maybeSingle();
        if (exists) {
          return fail(`Teacher ID "${teacherId}" is already taken.`, 409);
        }
        const { data, error } = await supabase.from("users").insert({
          student_id: teacherId,
          name: String(body.name).trim(),
          password_hash: await bcrypt.hash(body.password, 10),
          role: "teacher",
        }).select().single();
        if (error) throw error;
        return respond({
          message: "Teacher account created successfully!",
          token: await issueToken(data),
          user: summaryUser(data),
        }, 201);
      }
      const { data, error } = await supabase.from("users").select(
        "id, student_id, name, role",
      ).ilike("student_id", teacherId).eq("role", "teacher").maybeSingle();
      if (error) throw error;
      if (!data) return fail("Teacher account not found.", 404);
      const { error: updateError } = await supabase.from("users").update({
        password_hash: await bcrypt.hash(body.password, 10),
      }).eq("id", data.id);
      if (updateError) throw updateError;
      return respond({
        message: "Password reset successfully.",
        token: await issueToken(data),
        user: summaryUser(data),
      });
    }

    const user = await userFromRequest(req);
    const studentId = user.student_id;
    const clock = timeNow();
    const date = url.searchParams.get("date") || today();

    if (method === "GET" && path === "/study/today") {
      const { data: rows, error } = await supabase.from("study_hours").select(
        "*",
      ).eq("student_id", studentId).eq("date", date).order("hour_number");
      if (error) throw error;
      const { data: acknowledgement, error: ackError } = await supabase.from(
        "teacher_acknowledgements",
      ).select("teacher_id, reaction, comment, acknowledged_at").eq(
        "student_id",
        studentId,
      ).eq("date", date).maybeSingle();
      if (ackError) throw ackError;
      return respond({
        date,
        current_time: clock.hhmm,
        current_time_label: displayHm(clock.hhmm),
        scheduledCount: rows.length,
        hours: await Promise.all(rows.map((r) => sendHour(r, clock.minutes))),
        teacher_acknowledgement: acknowledgement,
      });
    }
    if (method === "GET" && path === "/study/week") {
      const start = url.searchParams.get("week_start") || "";
      const monday = dateObj(start);
      if (!monday || monday.getUTCDay() !== 1) {
        return fail("week_start must be a Monday date.");
      }
      const dates = getWeekDates(monday);
      const { data: rows, error } = await supabase.from("study_hours").select(
        "*",
      ).eq("student_id", studentId).in("date", dates).order("date").order(
        "hour_number",
      );
      if (error) throw error;
      const by_date: Record<string, unknown[]> = Object.fromEntries(
        dates.map((d) => [d, []]),
      );
      const formattedRows = await Promise.all(rows.map(async (row) => ({
        date: row.date,
        hour: await sendHour(row, clock.minutes),
      })));
      for (const row of formattedRows) by_date[row.date].push(row.hour);
      const bookingOpen = await getBookingOpen();
      return respond({
        week_start: start,
        dates,
        by_date,
        booking_open: bookingOpen,
      });
    }
    if (method === "POST" && path === "/study/schedule/day") {
      if (user.role !== "student") {
        return fail("Only students can create daily study plans.", 403);
      }
      const currentDate = new Date(`${today()}T12:00:00+05:30`);
      const bookingOpen = await getBookingOpen();
      if (currentDate.getDay() !== 0 && !bookingOpen) {
        return fail("Daily slot booking is available on Sundays only.", 403);
      }
      const target = dateObj(body.date);
      const bookingMonday = bookingWeekMonday(bookingOpen);
      const allowed = getWeekDates(bookingMonday);
      if (!target || target.getUTCDay() === 0 || !allowed.includes(body.date)) {
        return fail(
          "Choose a valid Monday–Saturday date in the open study week.",
        );
      }
      if (!Array.isArray(body.slots) || body.slots.length !== 4) {
        return fail("Exactly 4 study slots are required.");
      }
      const { data: oldRows, error } = await supabase.from("study_hours")
        .select("*").eq("student_id", studentId).eq("date", body.date);
      if (error) throw error;
      if (
        oldRows.length === 4 &&
        oldRows.every((r) => !!parsePayload(r.image_url).bookingConfirmedAt)
      ) return fail("This day is already booked and locked.", 409);
      const existing = new Map(oldRows.map((r) => [r.hour_number, r]));
      const confirmed = new Date().toISOString();
      const rows = body.slots.map((slot: any, index: number) => {
        const number = index + 1,
          subject = String(slot.subject || "").trim(),
          start = slot.planned_start,
          end = slot.planned_end;
        const manager = String(slot.manager_type || "SELF").toUpperCase(),
          startMin = hm(start),
          endMin = hm(end),
          prior = existing.get(number),
          payload = prior ? parsePayload(prior.image_url) : basePayload;
        if (
          !subject || !["SELF", "PARENT"].includes(manager) ||
          startMin === null || endMin === null || endMin <= startMin
        ) {
          throw new Error(
            `Slot ${number} needs a subject, manager, and valid time range.`,
          );
        }
        const unchanged = prior && prior.subject === subject &&
          payload.managerType === manager && payload.plannedStart === start &&
          payload.plannedEnd === end;
        if (
          prior && !unchanged &&
          (payload.attendanceStatus === "PRESENT" || payload.images.length)
        ) {
          throw new Error(
            `Slot ${number} already has activity and cannot be changed.`,
          );
        }
        const next = unchanged
          ? { ...payload, bookingConfirmedAt: confirmed }
          : {
            ...basePayload,
            images: payload.images,
            managerType: manager,
            attendanceStatus: manager === "PARENT" ? "PARENT" : "PENDING",
            bookingConfirmedAt: confirmed,
            plannedStart: start,
            plannedEnd: end,
          };
        return {
          student_id: studentId,
          date: body.date,
          hour_number: number,
          subject,
          time_slot: timeRange(start, end),
          image_url: serializePayload(next),
        };
      });
      const { error: saveError } = await supabase.from("study_hours").upsert(
        rows,
        { onConflict: "student_id,date,hour_number" },
      );
      if (saveError) throw saveError;
      return respond({
        message: "Daily study plan saved successfully.",
        date: body.date,
        hours: await Promise.all(
          rows.map((r: Record<string, any>) => sendHour(r, -1)),
        ),
      });
    }
    const markMatch = path.match(/^\/study\/slots\/(\d+)\/mark$/);
    if (method === "POST" && markMatch) {
      if (user.role !== "student") {
        return fail("Only students can mark study attendance.", 403);
      }
      const number = Number(markMatch[1]);
      if (number < 1 || number > 4) return fail("Invalid slot number.");
      const { data: row, error } = await supabase.from("study_hours").select(
        "*",
      ).eq("student_id", studentId).eq("date", body.date || today()).eq(
        "hour_number",
        number,
      ).maybeSingle();
      if (error) throw error;
      if (!row) return fail("This study slot has not been scheduled yet.", 404);
      const p = parsePayload(row.image_url),
        start = hm(p.plannedStart),
        current = clock.minutes;
      if (
        p.managerType !== "SELF" || p.attendanceStatus === "PRESENT" ||
        start === null || current < start || current > start + startGrace
      ) return fail("This slot cannot be marked present at the current time.");
      const payload = {
        ...p,
        attendanceStatus: "PRESENT",
        attendanceMarkedAt: displayHm(clock.hhmm),
        actualStart: clock.hhmm,
        actualEnd: toHm(current + 60),
      };
      const { data: updated, error: updateError } = await supabase.from(
        "study_hours",
      ).update({
        time_slot: timeRange(payload.actualStart, payload.actualEnd),
        image_url: serializePayload(payload),
      }).eq("id", row.id).select().single();
      if (updateError) throw updateError;
      return respond({
        message: "Slot attendance marked successfully.",
        hour: await sendHour(updated, current),
      });
    }
    const uploadMatch = path.match(
      /^\/study\/slots\/(\d+)\/upload(?:\/(complete))?$/,
    );
    if (method === "POST" && uploadMatch) {
      if (user.role !== "student") {
        return fail("Only students can upload study proof.", 403);
      }
      const number = Number(uploadMatch[1]),
        uploadDate = String(body.date || today());
      if (number < 1 || number > 4) return fail("Choose a valid slot.");
      const { data: row, error } = await supabase.from("study_hours").select(
        "*",
      ).eq("student_id", studentId).eq("date", uploadDate).eq(
        "hour_number",
        number,
      ).maybeSingle();
      if (error) throw error;
      if (!row) return fail("This study slot has not been scheduled yet.", 404);
      const p = parsePayload(row.image_url);
      if (
        p.managerType === "SELF" &&
        (p.attendanceStatus !== "PRESENT" || hm(p.actualEnd) === null ||
          clock.minutes < hm(p.actualEnd)! ||
          clock.minutes > hm(p.actualEnd)! + uploadGrace)
      ) {
        return fail(
          "The proof upload window is closed or attendance has not been marked.",
        );
      }
      if (
        p.managerType === "PARENT" &&
        (uploadDate !== today() || hm(p.plannedEnd) === null ||
          clock.minutes < hm(p.plannedEnd)!)
      ) {
        return fail(
          "Parent photos are accepted only after the booked session on its scheduled date.",
        );
      }
      if (uploadMatch[2]) {
        const paths = Array.isArray(body.paths) ? body.paths : [];
        if (
          !paths.length || paths.length > maxPhotos ||
          paths.some((objectPath: unknown) =>
            typeof objectPath !== "string" ||
            objectPath.split("/").length !== 2 ||
            objectPath.split("/")[0] !== studentId ||
            !/^[0-9a-f-]{36}\.[a-zA-Z0-9]+$/.test(objectPath.split("/")[1])
          )
        ) return fail("Invalid uploaded image paths.");
        if (p.images.length + paths.length > maxPhotos) {
          return fail(`You can upload up to ${maxPhotos} photos for one slot.`);
        }
        const verifiedPaths: string[] = [];
        const uploadedAtByPath = new Map<string, string>();
        for (const objectPath of paths as string[]) {
          const folder = objectPath.slice(0, objectPath.lastIndexOf("/"));
          const filename = objectPath.slice(objectPath.lastIndexOf("/") + 1);
          const { data: found, error: listError } = await supabase.storage.from(
            "study-photos",
          ).list(folder, { search: filename });
          if (listError) throw listError;
          if (!found?.some((entry) => entry.name === filename)) {
            return fail("An uploaded photo could not be verified.");
          }
          verifiedPaths.push(objectPath);
          const storageObject = found.find((entry) => entry.name === filename);
          uploadedAtByPath.set(
            objectPath,
            storageObject?.created_at || new Date().toISOString(),
          );
        }
        const { error: metadataError } = await supabase.from(
          "study_photo_uploads",
        )
          .upsert(
            verifiedPaths.map((objectPath) => ({
              object_path: objectPath,
              study_hour_id: row.id,
              uploaded_at: uploadedAtByPath.get(objectPath),
            })),
            { onConflict: "object_path", ignoreDuplicates: true },
          );
        if (metadataError) throw metadataError;
        const payload = { ...p, images: [...p.images, ...verifiedPaths] };
        const { data: updated, error: updateError } = await supabase.from(
          "study_hours",
        ).update({ image_url: serializePayload(payload) }).eq("id", row.id)
          .select().single();
        if (updateError) throw updateError;
        return respond({
          message: "Photos uploaded successfully.",
          hour: await sendHour(updated, clock.minutes),
        });
      }
      const files = Array.isArray(body.files) ? body.files : [];
      if (
        !files.length || files.length > maxPhotos ||
        files.some((file: any) =>
          !file || !/^[A-Z0-9_-]{3,32}$/i.test(studentId) ||
          !/^image\/(jpeg|png|webp|gif)$/.test(file.type) ||
          !Number.isFinite(file.size) || file.size <= 0 ||
          file.size > 5 * 1024 * 1024
        )
      ) {
        return fail(
          "Choose up to 25 JPEG, PNG, WEBP, or GIF images, each no larger than 5 MB.",
        );
      }
      if (p.images.length + files.length > maxPhotos) {
        return fail(`You can upload up to ${maxPhotos} photos for one slot.`);
      }
      const uploads = [];
      for (const file of files) {
        const extension =
          String(file.name).split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") ||
          "jpg";
        const objectPath = `${studentId}/${crypto.randomUUID()}.${extension}`;
        const { data: signed, error: signError } = await supabase.storage.from(
          "study-photos",
        ).createSignedUploadUrl(objectPath);
        if (signError) throw signError;
        uploads.push({ path: objectPath, signed_url: signed.signedUrl });
      }
      return respond({ uploads });
    }

    if (path.startsWith("/teacher/")) {
      if (!requireTeacher(user)) {
        return fail("Access denied. Requires teacher role.", 403);
      }
      if (path === "/teacher/booking-settings" && method === "GET") {
        return respond({ booking_open: await getBookingOpen() });
      }
      if (path === "/teacher/booking-settings" && method === "PUT") {
        if (typeof body.booking_open !== "boolean") {
          return fail("booking_open must be a boolean.");
        }
        const { data, error } = await supabase.from("booking_settings").upsert({
          id: "global",
          booking_open: body.booking_open,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" }).select("booking_open").single();
        if (error) throw error;
        return respond({
          message: data.booking_open
            ? "Student slot booking is open."
            : "Student slot booking is limited to Sundays.",
          booking_open: data.booking_open,
        });
      }
      if (method === "GET" && path === "/teacher/dashboard") {
        const reportDate = url.searchParams.get("date") || today();
        const { data: students, error: studentError } = await supabase.from(
          "users",
        ).select("id, student_id, name, mentor").eq("role", "student").order(
          "name",
        );
        if (studentError) throw studentError;
        const { data: rows, error: rowsError } = await supabase.from(
          "study_hours",
        ).select("*").gte("date", reportDate).order("date").order(
          "hour_number",
        );
        if (rowsError) throw rowsError;
        const { data: acks, error: ackError } = await supabase.from(
          "teacher_acknowledgements",
        ).select("*").eq("date", reportDate);
        if (ackError) throw ackError;
        const current = reportDate < today()
          ? 1440
          : reportDate > today()
          ? -1
          : clock.minutes;
        const metrics = {
          totalStudents: students.length,
          presentCount: 0,
          absentCount: 0,
          submittedCount: 0,
          pendingCount: 0,
        };
        const result = await Promise.all(students.map(async (s: any) => {
          const own = rows.filter((r: any) =>
            r.student_id === s.student_id && r.date === reportDate
          );
          const hours = await Promise.all([1, 2, 3, 4].map(async (n) => {
            const row = own.find((r: any) => r.hour_number === n),
              p = row ? parsePayload(row.image_url) : basePayload;
            const h = row ? await sendHour(row, current) : null;
            const status = row
              ? (p.managerType === "PARENT" ? "PARENT" : h!.attendance_status)
              : "PENDING";
            return {
              hour_number: n,
              completed: !!row,
              subject: row?.subject ?? null,
              time_slot: row?.time_slot ?? null,
              image_url: h?.image_url || null,
              image_urls: h?.image_urls || [],
              photo_count: p.images.length,
              created_at: row?.created_at ?? null,
              manager_type: p.managerType,
              attendance_status: status,
              attendance_marked_at: p.attendanceMarkedAt,
              planned_start: p.plannedStart,
              planned_end: p.plannedEnd,
              planned_time_slot: row
                ? timeRange(p.plannedStart, p.plannedEnd)
                : null,
              active_time_slot: p.actualStart
                ? timeRange(p.actualStart, p.actualEnd)
                : null,
              timing_label: status,
            };
          }));
          const present = hours.filter((h: any) =>
            h.attendance_status === "PRESENT"
          );
          const scheduled = hours.filter((h: any) => h.completed);
          const photoSlots = hours.filter((h: any) => h.photo_count > 0).length;
          const absent = scheduled.length > 0 &&
            scheduled.every((h: any) => h.attendance_status === "ABSENT");
          const overallStatus = photoSlots === 4
            ? "Submitted"
            : absent
            ? "Absent"
            : "Pending";
          if (overallStatus === "Submitted") metrics.submittedCount++;
          else if (overallStatus === "Absent") metrics.absentCount++;
          else {
            metrics.pendingCount++;
            if (present.length) metrics.presentCount++;
          }
          const bookings = reportDate < today()
            ? []
            : rows.filter((r: any) =>
              r.student_id === s.student_id && r.date >= reportDate &&
              !!parsePayload(r.image_url).bookingConfirmedAt
            );
          const bookingDate = bookings[0]?.date ?? null;
          const nextBookingHours = Object.fromEntries(
            bookings
              .filter((r: any) => r.date === bookingDate)
              .map((r: any) => {
                const payload = parsePayload(r.image_url);
                return [r.hour_number, {
                  subject: r.subject,
                  planned_start: payload.plannedStart,
                  planned_end: payload.plannedEnd,
                  planned_time_slot: timeRange(
                    payload.plannedStart,
                    payload.plannedEnd,
                  ),
                }];
              }),
          );
          return {
            ...s,
            acknowledgement: acks.find((a: any) =>
              a.student_id === s.student_id
            ) ?? null,
            next_booking_date: bookingDate,
            next_booking_hours: nextBookingHours,
            attendance: {
              marked: present.length > 0,
              time: present[0]?.attendance_marked_at ?? null,
              status: present.length
                ? "PRESENT"
                : absent
                ? "ABSENT"
                : "PENDING",
            },
            hours,
            completedHoursCount: scheduled.length,
            overallStatus,
          };
        }));
        return respond({ date: reportDate, metrics, students: result });
      }
      const ackMatch = path.match(
        /^\/teacher\/students\/([^/]+)\/acknowledgement$/,
      );
      if (method === "PUT" && ackMatch) {
        const student = decodeURIComponent(ackMatch[1]),
          reviewDate = body.date || today();
        const { data, error } = await supabase.from("teacher_acknowledgements")
          .upsert({
            student_id: student,
            date: reviewDate,
            teacher_id: studentId,
            reaction: "THUMBS_UP",
            comment: String(body.comment || "").trim().slice(0, 500) || null,
            acknowledged_at: new Date().toISOString(),
          }, { onConflict: "student_id,date" }).select(
            "student_id, teacher_id, reaction, comment, acknowledged_at",
          ).single();
        if (error) throw error;
        return respond({
          message: "Work acknowledged.",
          acknowledgement: data,
        });
      }
      const slotEdit = path.match(
        /^\/teacher\/students\/([^/]+)\/slots\/(\d{4}-\d{2}-\d{2})\/(\d+)$/,
      );
      if (method === "PUT" && slotEdit) {
        const start = hm(body.planned_start), end = hm(body.planned_end);
        if (start === null || end === null || end <= start) {
          return fail("End time must be later than start time.");
        }
        const { data: row, error } = await supabase.from("study_hours").select(
          "*",
        ).ilike("student_id", decodeURIComponent(slotEdit[1])).eq(
          "date",
          slotEdit[2],
        ).eq("hour_number", Number(slotEdit[3])).maybeSingle();
        if (error) throw error;
        if (!row) {
          return fail("This student has no booked slot for that date.", 404);
        }
        const p = parsePayload(row.image_url);
        if (p.attendanceStatus === "PRESENT" || p.images.length) {
          return fail(
            "A slot cannot be changed after attendance is marked or proof is uploaded.",
            409,
          );
        }
        await supabase.from("study_hours").update({
          time_slot: timeRange(body.planned_start, body.planned_end),
          image_url: serializePayload({
            ...p,
            plannedStart: body.planned_start,
            plannedEnd: body.planned_end,
          }),
        }).eq("id", row.id);
        return respond({
          message: "Slot updated.",
          slot: {
            student_id: row.student_id,
            date: row.date,
            hour_number: row.hour_number,
            planned_start: body.planned_start,
            planned_end: body.planned_end,
          },
        });
      }
      if (method === "POST" && path === "/teacher/students") {
        if (
          !body.name || !body.student_id || !body.password ||
          body.password.length < 6
        ) {
          return fail(
            "Name, student ID, mentor, and password of at least 6 characters are required.",
          );
        }
        if (!/^[A-Z0-9_-]{3,32}$/i.test(String(body.student_id))) {
          return fail(
            "Student ID must be 3–32 letters, numbers, underscores, or hyphens.",
          );
        }
        const mentor = await getMentor(body.mentor);
        const id = String(body.student_id).trim().toUpperCase();
        const { data, error } = await supabase.from("users").insert({
          student_id: id,
          name: String(body.name).trim(),
          mentor,
          password_hash: await bcrypt.hash(body.password, 10),
          role: "student",
        }).select("id, student_id, name, mentor, role").single();
        if (error) throw error;
        return respond({
          message: `Student "${data.name}" created successfully.`,
          student: data,
        }, 201);
      }
      const studentMatch = path.match(/^\/teacher\/students\/([^/]+)$/);
      if (studentMatch && method === "PUT") {
        const target = decodeURIComponent(studentMatch[1]);
        if (
          !String(body.name || "").trim() || !body.mentor ||
          (body.password && body.password.length < 6)
        ) {
          return fail(
            "Valid name, mentor, and optional password are required.",
          );
        }
        const mentor = await getMentor(body.mentor),
          updates: Record<string, unknown> = {
            name: String(body.name).trim(),
            mentor,
          };
        if (body.password) {
          updates.password_hash = await bcrypt.hash(body.password, 10);
        }
        const { data, error } = await supabase.from("users").update(updates)
          .ilike("student_id", target).eq("role", "student").select(
            "id, student_id, name, mentor, role",
          ).maybeSingle();
        if (error) throw error;
        if (!data) return fail("Student not found.", 404);
        return respond({
          message: `Student "${data.name}" updated successfully.`,
          student: data,
        });
      }
      if (studentMatch && method === "DELETE") {
        const target = decodeURIComponent(studentMatch[1]);
        const { data: found } = await supabase.from("users").select("name").eq(
          "student_id",
          target,
        ).eq("role", "student").maybeSingle();
        if (!found) return fail("Student not found.", 404);
        for (
          const table of [
            "study_hours",
            "study_submissions",
            "attendance",
            "teacher_acknowledgements",
          ]
        ) {
          const { error } = await supabase.from(table).delete().eq(
            "student_id",
            target,
          );
          if (error) throw error;
        }
        const { error } = await supabase.from("users").delete().eq(
          "student_id",
          target,
        ).eq("role", "student");
        if (error) throw error;
        return respond({
          message: `Student "${found.name}" (${target}) has been removed.`,
        });
      }
    }
    return fail("Not found.", 404);
  } catch (error) {
    if (error instanceof Response) {
      return new Response(error.body, {
        status: error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("API error", error);
    return fail(
      error instanceof Error ? error.message : "Unexpected API error.",
      500,
    );
  }
});
