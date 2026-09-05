import type { ProfilePayload, PublicField } from "@/lib/profile";
import { AlertIcon, ChevronRightIcon, PhoneIcon, ShieldIcon } from "./icons";

const CATEGORY_LABEL: Record<string, string> = {
  medical: "Medical",
  identity: "Identity",
  admin: "Administrative",
};

// These two identity facts double as the header subtitle, per the design
// spec's mockup ("34 · O NEGATIVE") — omitted from the Identity list below
// so they aren't shown twice.
const SUBTITLE_KEYS = ["age", "blood_type"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function groupByCategory(fields: PublicField[]): Map<string, PublicField[]> {
  const map = new Map<string, PublicField[]>();
  for (const field of fields) {
    if (field.category === "critical") continue;
    if (field.category === "identity" && SUBTITLE_KEYS.includes(field.key)) continue;
    const bucket = map.get(field.category) ?? [];
    bucket.push(field);
    map.set(field.category, bucket);
  }
  return map;
}

export function ProfileCard({
  payload,
  responderHref,
}: {
  payload: ProfilePayload;
  responderHref?: string;
}) {
  const isEmpty = payload.fields.length === 0 && payload.contacts.length === 0;
  const critical = payload.fields.filter((f) => f.category === "critical");
  const grouped = groupByCategory(payload.fields);
  const subtitle = SUBTITLE_KEYS.map((key) => payload.fields.find((f) => f.key === key)?.value)
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rq-profile-card">
      {payload.tier === "gated" && payload.unlockedBy && (
        <div className="rq-unlocked-strip">
          <ShieldIcon size={14} />
          Unlocked by {payload.unlockedBy}
        </div>
      )}

      {isEmpty ? (
        <div className="rq-empty-state">
          <div className="rq-empty-shield">
            <ShieldIcon />
          </div>
          <p className="rq-empty-title">{payload.displayName}</p>
          <p className="rq-empty-copy">
            This person has restricted their information to verified first responders.
          </p>
        </div>
      ) : (
        <>
          <div className="rq-profile-header">
            <div className="rq-profile-photo">
              {payload.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={payload.photoUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }}
                />
              ) : (
                initials(payload.displayName)
              )}
            </div>
            <div>
              <p className="rq-profile-name" style={{ textTransform: "uppercase" }}>
                {payload.displayName}
              </p>
              {subtitle && <p className="rq-profile-sub">{subtitle}</p>}
            </div>
          </div>

          {critical.length > 0 && (
            <div className="rq-alert-band">
              {critical.map((field) => (
                <div className="rq-alert-row" key={field.key}>
                  <span className="rq-alert-icon">
                    <AlertIcon />
                  </span>
                  <div>
                    <p className="rq-alert-label">{field.label}</p>
                    <p className="rq-alert-value">{field.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {["identity", "medical", "admin"].map((category) => {
            const rows = grouped.get(category);
            if (!rows || rows.length === 0) return null;
            return (
              <div className="rq-section" key={category}>
                <p className="rq-section-title">{CATEGORY_LABEL[category]}</p>
                {rows.map((field) => (
                  <div className="rq-fact-row" key={field.key}>
                    <span className="rq-fact-label">{field.label}</span>
                    <span className="rq-fact-value">{field.value}</span>
                  </div>
                ))}
              </div>
            );
          })}

          {payload.contacts.length > 0 && (
            <div className="rq-section">
              <p className="rq-section-title">Contacts</p>
              <div className="rq-call-list">
                {payload.contacts.map((contact) => (
                  <div key={contact.dialCode}>
                    <a
                      className={`rq-call-btn${contact.phone ? " rq-call-direct" : ""}`}
                      href={contact.tel}
                    >
                      <PhoneIcon size={17} />
                      Call {contact.name}
                      {contact.relationship && <small>&nbsp;({contact.relationship})</small>}
                    </a>
                    {!contact.phone && (
                      <p className="rq-dial-hint">If prompted, enter code {contact.dialCode}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {responderHref && (
        <div className="rq-responder-cta">
          <a className="rq-responder-link" href={responderHref}>
            I&rsquo;m a first responder
            <ChevronRightIcon size={15} />
          </a>
        </div>
      )}
    </div>
  );
}
