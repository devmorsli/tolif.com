import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type WizardStep = 1 | 2 | 3 | 4;

export interface UploadSlot {
  name: string;
  label: string;
  type: "person" | "pet";
  required: boolean;
  file?: File;
  previewUrl?: string;
}

export interface Template {
  id: string;
  slug: string;
  name: string;
  category: string;
  style: string;
  uploadSlots: UploadSlot[];
}

export interface ProductVariant {
  id: string;
  productName: string;
  size: string;
  price: number;
  currency: string;
  type: "digital" | "poster" | "framed" | "canvas";
  format?: string;
  frame?: string;
}

export interface ShippingOption {
  id: string;
  label: string;
  description: string;
  price: number;
  currency: string;
  days?: string;
  badge?: string;
}

interface WizardState {
  step: WizardStep;
  sessionId: string | null;
  selectedTemplate: Template | null;
  uploadSlots: UploadSlot[];
  gdprConsent: boolean;
  generationStatus: "idle" | "generating" | "ready" | "failed" | "refused";
  previewUrl: string | null;
  regenerationsLeft: number;
  selectedVariant: ProductVariant | null;
  selectedShipping: ShippingOption | null;

  // Actions
  goTo: (step: WizardStep) => void;
  next: () => void;
  back: () => void;
  selectTemplate: (template: Template) => void;
  setUploadSlot: (slotName: string, file: File, previewUrl: string) => void;
  setGdprConsent: (v: boolean) => void;
  setGenerationStatus: (s: WizardState["generationStatus"]) => void;
  setPreviewUrl: (url: string) => void;
  setSessionId: (id: string) => void;
  decrementRegenerations: () => void;
  setRegenerationsLeft: (n: number) => void;
  selectVariant: (v: ProductVariant) => void;
  setShipping: (option: ShippingOption) => void;
  clearCart: () => void;
  reset: () => void;
}

const initialState = {
  step: 1 as WizardStep,
  sessionId: null,
  selectedTemplate: null,
  uploadSlots: [],
  gdprConsent: false,
  generationStatus: "idle" as const,
  previewUrl: null,
  regenerationsLeft: 5,
  selectedVariant: null,
  selectedShipping: null,
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      ...initialState,

      goTo: (step) => set({ step }),
      next: () => set((s) => ({ step: Math.min(4, s.step + 1) as WizardStep })),
      back: () => set((s) => ({ step: Math.max(1, s.step - 1) as WizardStep })),

      selectTemplate: (template) =>
        set({ selectedTemplate: template, uploadSlots: template.uploadSlots }),

      setUploadSlot: (slotName, file, previewUrl) =>
        set((s) => ({
          uploadSlots: s.uploadSlots.map((slot) =>
            slot.name === slotName ? { ...slot, file, previewUrl } : slot
          ),
        })),

      setGdprConsent: (v) => set({ gdprConsent: v }),
      setGenerationStatus: (s) => set({ generationStatus: s }),
      setPreviewUrl: (url) => set({ previewUrl: url }),
      setSessionId: (id) => set({ sessionId: id }),
      decrementRegenerations: () =>
        set((s) => ({ regenerationsLeft: Math.max(0, s.regenerationsLeft - 1) })),
      setRegenerationsLeft: (n) => set({ regenerationsLeft: n }),
      selectVariant: (v) => set({ selectedVariant: v }),
      setShipping: (option) => set({ selectedShipping: option }),
      clearCart: () => set({ selectedVariant: null, selectedShipping: null }),
      reset: () => set(initialState),
    }),
    {
      name: "tolif-wizard",
      storage: createJSONStorage(() => localStorage),
      // Only persist the cart & session fields.
      // uploadSlots is excluded because File objects aren't JSON-serialisable.
      partialize: (state) => ({
        step:             state.step,
        sessionId:        state.sessionId,
        selectedTemplate: state.selectedTemplate,
        previewUrl:       state.previewUrl,
        selectedVariant:  state.selectedVariant,
        selectedShipping: state.selectedShipping,
        regenerationsLeft: state.regenerationsLeft,
        gdprConsent:      state.gdprConsent,
        generationStatus: state.generationStatus,
      }),
    }
  )
);
