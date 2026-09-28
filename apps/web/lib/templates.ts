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
  price: number;
  seoTitle: string;
  seoDescription: string;
}

export const TEMPLATES: TemplateData[] = [
  {
    id: "1",
    slug: "woman-with-dog",
    name: "Woman with Dog",
    category: "Dogs",
    style: "Oil Painting",
    description: "A warm, painterly portrait of you and your dog in a classic studio style.",
    longDescription:
      "Our most beloved template — a rich, textured oil painting that captures the warmth between you and your dog. Dramatic studio lighting, rich earthy tones, and expressive brushwork make this a timeless piece worthy of any wall.",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet", label: "Your dog's photo", type: "pet", required: true },
    ],
    gradient: "from-[#C4622D]/20 via-[#E8A838]/10 to-[#FAF6F0]",
    emoji: "🧑‍🦰🐕",
    bestseller: true,
    price: 19.99,
    seoTitle: "Woman with Dog AI Portrait | Tolif",
    seoDescription: "Turn your photo into a stunning oil painting portrait with your dog. Upload, preview, and order in minutes.",
  },
  {
    id: "2",
    slug: "man-with-cat",
    name: "Man with Cat",
    category: "Cats",
    style: "Impressionist",
    description: "Soft impressionist brushstrokes capturing the quiet bond of man and cat.",
    longDescription:
      "Inspired by the great impressionists — dappled indoor light, loose brushwork, and a cosy armchair setting. Your face and your cat's markings are rendered with remarkable accuracy, giving you a portrait that feels like it belongs in a gallery.",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet", label: "Your cat's photo", type: "pet", required: true },
    ],
    gradient: "from-[#2D4A3E]/20 via-[#D4942A]/10 to-[#FAF6F0]",
    emoji: "👨🐈",
    bestseller: false,
    price: 19.99,
    seoTitle: "Man with Cat AI Portrait | Tolif",
    seoDescription: "An impressionist-style AI portrait of you and your cat. Free preview, instant download.",
  },
  {
    id: "3",
    slug: "couple-with-dog",
    name: "Couple with Dog",
    category: "Couple & Pet",
    style: "Golden Hour",
    description: "Bathed in golden-hour light — you, your partner, and your beloved dog.",
    longDescription:
      "A sun-kissed outdoor meadow portrait with warm golden-hour lighting. Perfect as a gift for anniversaries, new homes, or simply to celebrate your little family. Both faces and your dog are rendered with full likeness.",
    uploadSlots: [
      { name: "person1", label: "Person 1 photo", type: "person", required: true },
      { name: "person2", label: "Person 2 photo", type: "person", required: true },
      { name: "pet", label: "Your dog's photo", type: "pet", required: true },
    ],
    gradient: "from-[#D4942A]/20 via-[#C4622D]/10 to-[#FAF6F0]",
    emoji: "👫🐕",
    bestseller: true,
    price: 19.99,
    seoTitle: "Couple with Dog AI Portrait | Tolif",
    seoDescription: "A golden-hour portrait of you, your partner, and your dog. A perfect gift for couples.",
  },
  {
    id: "4",
    slug: "woman-with-cat",
    name: "Woman with Cat",
    category: "Cats",
    style: "Watercolour",
    description: "Delicate watercolour washes and soft morning light — you and your cat.",
    longDescription:
      "Soft, luminous watercolour with gentle blooms of colour and a warm morning-light atmosphere. The result is dreamy yet precise — your face and your cat's unique colouring shine through beautifully.",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet", label: "Your cat's photo", type: "pet", required: true },
    ],
    gradient: "from-[#F0D5C0]/50 via-[#C4622D]/8 to-[#FAF6F0]",
    emoji: "👩🐱",
    bestseller: false,
    price: 19.99,
    seoTitle: "Woman with Cat AI Portrait | Tolif",
    seoDescription: "A soft watercolour AI portrait of you and your cat. Beautiful, unique, and personal.",
  },
  {
    id: "5",
    slug: "multiple-pets",
    name: "Person & Multiple Pets",
    category: "Multiple Pets",
    style: "Digital Art",
    description: "Vibrant digital art for those who refuse to choose a favourite pet.",
    longDescription:
      "Can't choose just one pet? This template is for you. Bright, saturated digital art style with bold colours and a playful composition — you and up to two pets, all together in one unforgettable portrait.",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet1", label: "Pet 1 photo", type: "pet", required: true },
      { name: "pet2", label: "Pet 2 photo", type: "pet", required: true },
    ],
    gradient: "from-[#2D4A3E]/15 via-[#E8A838]/15 to-[#FAF6F0]",
    emoji: "🧑🐕🐈",
    bestseller: false,
    price: 19.99,
    seoTitle: "Person with Multiple Pets AI Portrait | Tolif",
    seoDescription: "An AI portrait of you with two pets. Bold digital art style — for those with full hearts.",
  },
  {
    id: "6",
    slug: "man-with-dog",
    name: "Man with Dog",
    category: "Dogs",
    style: "Realistic Oil",
    description: "A lifelike oil painting of you and your dog, fit for a classic frame.",
    longDescription:
      "Hyper-realistic oil painting style with natural park lighting, detailed fur and skin tones, and a timeless composition. The most photorealistic of our templates — almost indistinguishable from a commissioned painting.",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet", label: "Your dog's photo", type: "pet", required: true },
    ],
    gradient: "from-[#8C7B6B]/15 via-[#C4622D]/10 to-[#FAF6F0]",
    emoji: "👨🐶",
    bestseller: false,
    price: 19.99,
    seoTitle: "Man with Dog AI Portrait | Tolif",
    seoDescription: "A realistic oil painting AI portrait of you and your dog. Stunningly lifelike.",
  },
];

export function getTemplate(slug: string): TemplateData | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
