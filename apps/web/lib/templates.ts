export interface TemplateData {
  id: string;
  slug: string;
  name: string;
  category: string;
  style: string;
  description: string;
  longDescription: string;
  uploadSlots: { name: string; label: string; type: "person" | "pet"; required: boolean }[];
  gradient: string;
  emoji: string;
  bestseller: boolean;
  seoTitle: string;
  seoDescription: string;
}

export const TEMPLATES: TemplateData[] = [
  {
    id: "1",
    slug: "royal-family",
    name: "Royal Family Portrait",
    category: "Families",
    style: "Classic Oil",
    description: "A timeless oil painting capturing your whole family in classic, regal style.",
    longDescription:
      "Inspired by the great portrait masters — rich earthy tones, dramatic studio lighting, and expressive brushwork. Upload photos of your family members and our AI recreates everyone's likeness in one breathtaking composition worthy of any wall.",
    uploadSlots: [
      { name: "person1", label: "Person 1 photo", type: "person", required: true },
      { name: "person2", label: "Person 2 photo", type: "person", required: false },
      { name: "person3", label: "Person 3 photo (optional)", type: "person", required: false },
    ],
    gradient: "from-[#C4622D]/20 via-[#E8A838]/10 to-[#FAF6F0]",
    emoji: "👨‍👩‍👧‍👦",
    bestseller: true,
    seoTitle: "Family AI Portrait — Classic Oil Painting | Tolif",
    seoDescription: "Turn your family photos into a stunning classic oil painting portrait. Free preview, instant download.",
  },
  {
    id: "2",
    slug: "golden-couple",
    name: "Golden Hour Couple",
    category: "Couples",
    style: "Golden Hour",
    description: "Bathed in warm golden-hour light — a romantic portrait of you and your partner.",
    longDescription:
      "A sun-kissed outdoor portrait with warm golden light, soft bokeh, and a timeless romantic atmosphere. Perfect as a gift for anniversaries, engagements, or simply to celebrate your love. Both faces are rendered with full likeness.",
    uploadSlots: [
      { name: "person1", label: "Person 1 photo", type: "person", required: true },
      { name: "person2", label: "Person 2 photo", type: "person", required: true },
    ],
    gradient: "from-[#D4942A]/25 via-[#C4622D]/10 to-[#FAF6F0]",
    emoji: "👫",
    bestseller: true,
    seoTitle: "Couple AI Portrait — Golden Hour Style | Tolif",
    seoDescription: "A romantic golden-hour portrait of you and your partner. A perfect gift for couples.",
  },
  {
    id: "3",
    slug: "studio-solo",
    name: "Studio Solo Portrait",
    category: "Solo",
    style: "Studio Art",
    description: "A bold, confident studio portrait that captures your personality and presence.",
    longDescription:
      "Clean studio lighting, rich background tones, and a commanding composition — this template is all about you. Perfect as a personal keepsake, a thoughtful gift, or a unique piece for your home.",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
    ],
    gradient: "from-[#2D4A3E]/25 via-[#D4942A]/10 to-[#FAF6F0]",
    emoji: "🧑",
    bestseller: false,
    seoTitle: "Solo AI Portrait — Studio Style | Tolif",
    seoDescription: "A stunning studio-style AI portrait of you. Bold, confident, and uniquely yours.",
  },
  {
    id: "4",
    slug: "family-with-pet",
    name: "Family & Pet",
    category: "Families",
    style: "Impressionist",
    description: "Soft impressionist brushstrokes capturing your family and beloved pet together.",
    longDescription:
      "Dappled indoor light, loose impressionist brushwork, and a cosy warm atmosphere. Everyone's faces — and your pet's unique markings — are rendered with remarkable accuracy, giving you a portrait that feels like it belongs in a gallery.",
    uploadSlots: [
      { name: "person1", label: "Person 1 photo", type: "person", required: true },
      { name: "person2", label: "Person 2 photo", type: "person", required: false },
      { name: "pet", label: "Your pet's photo", type: "pet", required: true },
    ],
    gradient: "from-[#2D4A3E]/20 via-[#C4622D]/10 to-[#FAF6F0]",
    emoji: "👨‍👩‍👦🐕",
    bestseller: false,
    seoTitle: "Family & Pet AI Portrait — Impressionist Style | Tolif",
    seoDescription: "An impressionist-style AI portrait of your family and pet together. Free preview, instant download.",
  },
  {
    id: "5",
    slug: "best-friends",
    name: "Best Friends",
    category: "Groups",
    style: "Watercolour",
    description: "Delicate watercolour washes and warm light — you and your closest friends.",
    longDescription:
      "Soft, luminous watercolour with gentle blooms of colour and a warm, joyful atmosphere. The result is dreamy yet precise — every person's unique features shine through beautifully in this group keepsake.",
    uploadSlots: [
      { name: "person1", label: "Person 1 photo", type: "person", required: true },
      { name: "person2", label: "Person 2 photo", type: "person", required: true },
      { name: "person3", label: "Person 3 photo (optional)", type: "person", required: false },
    ],
    gradient: "from-[#F0D5C0]/50 via-[#C4622D]/8 to-[#FAF6F0]",
    emoji: "👩‍👩‍👧",
    bestseller: false,
    seoTitle: "Best Friends AI Portrait — Watercolour Style | Tolif",
    seoDescription: "A soft watercolour AI portrait of you and your friends. Beautiful, unique, and personal.",
  },
  {
    id: "6",
    slug: "person-with-pet",
    name: "Person & Pet",
    category: "Pets",
    style: "Oil Painting",
    description: "A warm, painterly portrait of you and your beloved pet in classic studio style.",
    longDescription:
      "Our most beloved template — a rich, textured oil painting that captures the warmth between you and your pet. Dramatic studio lighting, rich earthy tones, and expressive brushwork make this a timeless piece worthy of any wall.",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet", label: "Your pet's photo", type: "pet", required: true },
    ],
    gradient: "from-[#8C7B6B]/15 via-[#C4622D]/10 to-[#FAF6F0]",
    emoji: "🧑🐾",
    bestseller: false,
    seoTitle: "Person & Pet AI Portrait | Tolif",
    seoDescription: "A stunning oil painting AI portrait of you and your pet. Stunningly lifelike.",
  },
  {
    id: "7",
    slug: "couple-with-pet",
    name: "Couple with Pet",
    category: "Pets",
    style: "Romantic",
    description: "Warm and intimate — you, your partner, and your beloved pet together.",
    longDescription:
      "An intimate, warmly lit portrait with a romantic atmosphere. Both faces and your pet are rendered with full likeness. Perfect as a gift for anniversaries, new homes, or simply to celebrate your little family.",
    uploadSlots: [
      { name: "person1", label: "Person 1 photo", type: "person", required: true },
      { name: "person2", label: "Person 2 photo", type: "person", required: true },
      { name: "pet", label: "Your pet's photo", type: "pet", required: true },
    ],
    gradient: "from-[#C4622D]/15 via-[#D4942A]/10 to-[#FAF6F0]",
    emoji: "👫🐾",
    bestseller: false,
    seoTitle: "Couple with Pet AI Portrait | Tolif",
    seoDescription: "A romantic AI portrait of you, your partner, and your pet. A perfect gift for couples.",
  },
  {
    id: "8",
    slug: "adventure-group",
    name: "Adventure Group",
    category: "Groups",
    style: "Digital Art",
    description: "Vibrant digital art for groups — bold colours and a playful, dynamic composition.",
    longDescription:
      "Bright, saturated digital art style with bold colours and an energetic composition — perfect for friend groups, sports teams, or any crew that shares adventures. Up to three people, each rendered with their unique likeness.",
    uploadSlots: [
      { name: "person1", label: "Person 1 photo", type: "person", required: true },
      { name: "person2", label: "Person 2 photo", type: "person", required: true },
      { name: "person3", label: "Person 3 photo (optional)", type: "person", required: false },
    ],
    gradient: "from-[#2D4A3E]/15 via-[#E8A838]/15 to-[#FAF6F0]",
    emoji: "🧑‍🤝‍🧑",
    bestseller: false,
    seoTitle: "Group AI Portrait — Digital Art Style | Tolif",
    seoDescription: "A vibrant digital art AI portrait for groups. Bold, colourful, and unforgettable.",
  },
];

export function getTemplate(slug: string): TemplateData | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
