export type MaiaTemplate = {
  label: string;
  prompt: string;
  platform: string;
  contentType: string;
};

export const MAIA_TEMPLATES: Record<string, MaiaTemplate> = {
  instagram_post: {
    label: "Instagram Post",
    prompt:
      "Create an Instagram post about KONSTRUKT Academy. Include relevant emojis, hashtags, and a clear call-to-action. Target: parents of 9-16 year olds.",
    platform: "instagram",
    contentType: "social_post",
  },
  whatsapp_broadcast: {
    label: "WhatsApp Broadcast",
    prompt:
      "Write a WhatsApp broadcast message to parents announcing [TOPIC]. Keep it under 200 words, conversational, with a clear CTA.",
    platform: "whatsapp",
    contentType: "whatsapp",
  },
  admission_email: {
    label: "Admission Email",
    prompt:
      "Write a compelling email to parents who enquired about KONSTRUKT Academy. Subject line + body. Emphasize batch starting soon and limited seats.",
    platform: "email",
    contentType: "email",
  },
  school_partnership: {
    label: "School Partnership Letter",
    prompt:
      "Write a professional letter to a school principal proposing a partnership with KONSTRUKT Academy for their students.",
    platform: "letter",
    contentType: "announcement",
  },
  facebook_ad: {
    label: "Facebook Ad Copy",
    prompt:
      "Write Facebook ad copy for KONSTRUKT Academy. Primary text + headline + description. Target: parents in Kerala.",
    platform: "facebook",
    contentType: "ad_copy",
  },
  batch_announcement: {
    label: "New Batch Announcement",
    prompt:
      "Announce the launch of a new KONSTRUKT Academy batch starting [DATE] in [LOCATION]. Create urgency, limited seats message.",
    platform: "multi",
    contentType: "announcement",
  },
  success_story: {
    label: "Student Success Story",
    prompt:
      "Write a student success story template about a student who completed KONSTRUKT Academy and built their first robot. Fill with vivid details.",
    platform: "instagram",
    contentType: "social_post",
  },
  parent_testimonial: {
    label: "Parent Testimonial Template",
    prompt:
      "Write 3 different parent testimonial templates in varying lengths (short/medium/long) for KONSTRUKT Academy.",
    platform: "multi",
    contentType: "announcement",
  },
  event_announcement: {
    label: "Demo Day Announcement",
    prompt:
      "Create an announcement for KONSTRUKT Academy Demo Day where students showcase their robots. Include excitement, invite parents, mention achievements.",
    platform: "multi",
    contentType: "announcement",
  },
  google_ad: {
    label: "Google Ad Copy",
    prompt:
      "Write Google search ad copy for KONSTRUKT Academy. 3 headlines + 2 descriptions. Keywords: robotics class Kerala, coding for kids, STEM program.",
    platform: "google",
    contentType: "ad_copy",
  },
};

export const TEMPLATE_KEYS = Object.keys(MAIA_TEMPLATES);
