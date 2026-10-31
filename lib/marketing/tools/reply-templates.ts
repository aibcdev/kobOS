/**
 * Hand-written review reply templates for the free picker (/tools/review-reply-templates). Static text: nothing is
 * generated and nothing posts anywhere. Written to Google's reply tips: thank them, be specific and short, apologise
 * when it's due, take complaints offline, and never offer anything in return for a review. Nothing here claims a
 * change the owner hasn't made; [square brackets] mark a line they fill in themselves.
 */

export const REPLY_TEMPLATE_SOURCE = {
  label: "Google Business Profile Help: Tips to get more reviews (tips to write better review replies; checked 31 Oct 2026)",
  href: "https://support.google.com/business/answer/3474122",
} as const;

export const PLACEHOLDERS = ["{guestName}", "{dishOrDetail}", "{managerName}"] as const;

export type ReplyTheme =
  | "slow-service"
  | "cold-food"
  | "booking-mix-up"
  | "noise"
  | "price"
  | "great-staff"
  | "first-visit"
  | "regular"
  | "allergy-or-illness";

export const THEME_LABELS: Record<ReplyTheme, string> = {
  "slow-service": "Slow service",
  "cold-food": "Cold food",
  "booking-mix-up": "Booking mix-up",
  noise: "Too noisy",
  price: "Price",
  "great-staff": "Mentions great staff",
  "first-visit": "First visit",
  regular: "A regular",
  "allergy-or-illness": "Allergy or feeling ill",
};

export type ReplyTemplate = { id: string; stars: 1 | 2 | 3 | 4 | 5; theme: ReplyTheme; note: string; text: string };

export const REPLY_TEMPLATES: ReplyTemplate[] = [
  {
    id: "1-slow-service",
    stars: 1,
    theme: "slow-service",
    note: "Own the wait, say what you're changing, take it offline.",
    text: "Hi {guestName}, thank you for telling us, and I'm sorry you waited so long for {dishOrDetail}. That's not the evening we want anyone to have. I've shared your review with the team so we can look at how we pace orders on busy nights. If you'd like to tell me more, please get in touch with me directly and I'll make sure it's put right. {managerName}",
  },
  {
    id: "2-slow-service",
    stars: 2,
    theme: "slow-service",
    note: "Acknowledge the good bits they mentioned, then the wait.",
    text: "Hi {guestName}, thanks for coming in and for the kind words about {dishOrDetail}. I'm sorry the wait took the shine off it. Whatever the reason, the wait is our problem to solve, not yours. I'd love the chance to show you a smoother visit. {managerName}",
  },
  {
    id: "1-cold-food",
    stars: 1,
    theme: "cold-food",
    note: "Apologise plainly. Don't argue about the temperature in public.",
    text: "Hi {guestName}, I'm sorry {dishOrDetail} reached you cold. That shouldn't happen, and I've shared your review with the kitchen so we can find out where it went wrong. Please get in touch with me directly if you're happy to share a few more details. {managerName}",
  },
  {
    id: "2-cold-food",
    stars: 2,
    theme: "cold-food",
    note: "Short and specific.",
    text: "Hi {guestName}, thank you for the honest review. I'm sorry {dishOrDetail} wasn't hot when it reached the table. I've shared this with the kitchen so it doesn't happen again. {managerName}",
  },
  {
    id: "1-booking-mix-up",
    stars: 1,
    theme: "booking-mix-up",
    note: "Don't blame the guest or the booking system in public.",
    text: "Hi {guestName}, I'm really sorry about the mix-up with your booking. Arriving to find no table is frustrating, especially on a special night. I'm looking into what happened so it doesn't happen to anyone else. Please get in touch with me directly so I can hear the details. {managerName}",
  },
  {
    id: "3-noise",
    stars: 3,
    theme: "noise",
    note: "Thank them for the positives and give a practical tip.",
    text: "Hi {guestName}, thanks for visiting and for the kind words about {dishOrDetail}. You're right that it gets lively on weekend evenings. If you'd like a quieter table next time, mention it when you book and we'll seat you away from the bar. {managerName}",
  },
  {
    id: "3-price",
    stars: 3,
    theme: "price",
    note: "Explain without getting defensive. Never offer a discount for an edit.",
    text: "Hi {guestName}, thank you for the fair review. We know our prices aren't the lowest, and we'd rather explain than hide it: {dishOrDetail} is [say what goes into it, such as how it's made or where it comes from]. Thanks for giving us a try. {managerName}",
  },
  {
    id: "3-slow-service",
    stars: 3,
    theme: "slow-service",
    note: "Mixed review: thank, acknowledge, invite back.",
    text: "Hi {guestName}, thanks for the mixed but honest review. Glad you enjoyed {dishOrDetail}, and sorry the service was slower than it should have been. We're working on it, and we hope the next visit is a five-star one. {managerName}",
  },
  {
    id: "4-great-staff",
    stars: 4,
    theme: "great-staff",
    note: "Name the team member if the guest did.",
    text: "Hi {guestName}, thank you! I've passed your kind words on to the team, and they made their day. Glad you enjoyed {dishOrDetail} too. See you again soon. {managerName}",
  },
  {
    id: "5-great-staff",
    stars: 5,
    theme: "great-staff",
    note: "Keep it short. Mention one detail.",
    text: "Hi {guestName}, thank you so much. The team will be thrilled to read this, and I'll make sure they do. Really glad {dishOrDetail} hit the spot. {managerName}",
  },
  {
    id: "4-first-visit",
    stars: 4,
    theme: "first-visit",
    note: "Welcome them and give a reason to come back, not a deal.",
    text: "Hi {guestName}, thanks for choosing us for your first visit, and for the lovely review. Glad {dishOrDetail} went down well. Next time, ask us what's new on the menu. {managerName}",
  },
  {
    id: "5-first-visit",
    stars: 5,
    theme: "first-visit",
    note: "Warm and personal.",
    text: "Hi {guestName}, what a lovely first review to read. Thank you for coming in, and we're so glad you enjoyed {dishOrDetail}. We hope to see you again soon. {managerName}",
  },
  {
    id: "5-regular",
    stars: 5,
    theme: "regular",
    note: "Regulars notice a generic reply. Make it personal.",
    text: "Hi {guestName}, thank you, it's always good to see you. Glad {dishOrDetail} is still a favourite. The whole team appreciates you coming back, and taking the time to write this. {managerName}",
  },
  {
    id: "2-regular",
    stars: 2,
    theme: "regular",
    note: "A regular having a bad night deserves a direct follow-up.",
    text: "Hi {guestName}, thank you for telling us. You know us well, so it matters when we get it wrong. I'm sorry {dishOrDetail} wasn't up to the usual standard. Please get in touch with me directly. I'd like to hear what happened. {managerName}",
  },
  {
    id: "1-allergy-or-illness",
    stars: 1,
    theme: "allergy-or-illness",
    note: "Sensitive: don't discuss details, admit fault or argue in public. Take it offline straight away.",
    text: "Hi {guestName}, I'm very sorry to read this, and I'm glad you told us. We take allergies and anyone feeling unwell seriously. Please get in touch with me directly so I can understand exactly what happened and look into it properly. {managerName}",
  },
  {
    id: "4-noise",
    stars: 4,
    theme: "noise",
    note: "Positive review with one niggle: thank first.",
    text: "Hi {guestName}, thank you for the kind review and for the note about the music. Fair point, and I've passed it on to the team. Glad you enjoyed {dishOrDetail}. {managerName}",
  },
];
