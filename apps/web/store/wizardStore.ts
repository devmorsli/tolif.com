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
  templateImageKey?: string;
  uploadSlots: UploadSlot[];
  extraPersonsAllowed: number;
  extraPetsAllowed: number;
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

export interface CartItem {
  id: string;           // unique cart-item id (crypto.randomUUID())
  sessionId: string;    // the PortraitSession GUID for this portrait
  previewUrl: string | null;
  variant: ProductVariant;
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
  cartItems: CartItem[];
  preferredCategory: string | null;
  customerEmail: string | null;

  // Actions
  goTo: (step: WizardStep) => void;
  next: () => void;
  back: () => void;
  selectTemplate: (template: Template) => void;
  setPreferredCategory: (category: string | null) => void;
  setUploadSlot: (slotName: string, file: File, previewUrl: string) => void;
  setGdprConsent: (v: boolean) => void;
  setGenerationStatus: (s: WizardState["generationStatus"]) => void;
  setPreviewUrl: (url: string) => void;
  setSessionId: (id: string) => void;
  decrementRegenerations: () => void;
  setRegenerationsLeft: (n: number) => void;
  selectVariant: (v: ProductVariant) => void;
  setShipping: (option: ShippingOption) => void;
  addCartItem: (item: CartItem) => void;
  removeCartItem: (id: string) => void;
  addExtraSlot: (type: "person" | "pet") => void;
  removeExtraSlot: (slotName: string) => void;
  clearCart: () => void;
  reset: () => void;
  setCustomerEmail: (email: string) => void;
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
  cartItems: [] as CartItem[],
  preferredCategory: null as string | null,
  customerEmail: null as string | null,
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      ...initialState,

      goTo: (step) => set({ step }),
      setPreferredCategory: (category) => set({ preferredCategory: category }),
      next: () => set((s) => ({ step: Math.min(4, s.step + 1) as WizardStep })),
      back: () => set((s) => ({ step: Math.max(1, s.step - 1) as WizardStep })),

      selectTemplate: (template) => {
        // Only the FIRST slot of each type (person/pet) is required.
        // Subsequent same-type slots become optional so users with fewer
        // family members / pets can still proceed.
        const seenTypes = new Set<string>();
        const uploadSlots = template.uploadSlots.map((slot) => {
          if (slot.type !== "person" && slot.type !== "pet") return slot;
          if (!seenTypes.has(slot.type)) {
            seenTypes.add(slot.type);
            return slot; // first of this type — keep original required flag
          }
          return { ...slot, required: false }; // subsequent — make optional
        });
        set({ selectedTemplate: template, uploadSlots });
      },

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
      addCartItem: (item) => set((s) => ({ cartItems: [...s.cartItems, item] })),
      removeCartItem: (id) => set((s) => ({ cartItems: s.cartItems.filter((i) => i.id !== id) })),
      addExtraSlot: (type) =>
        set((s) => {
          const existing = s.uploadSlots.filter((sl) => sl.type === type);
          const index    = existing.length + 1;
          const label    = type === "person" ? `Person ${index}` : `Pet ${index}`;
          const newSlot: UploadSlot = {
            name:     `extra_${type}_${Date.now()}`,
            label,
            type,
            required: false,
          };
          return { uploadSlots: [...s.uploadSlots, newSlot] };
        }),
      removeExtraSlot: (slotName) =>
        set((s) => ({
          uploadSlots: s.uploadSlots.filter((sl) => sl.name !== slotName),
        })),
      clearCart: () => set({ selectedVariant: null, selectedShipping: null }),
      reset: () => set(initialState),
      setCustomerEmail: (email) => set({ customerEmail: email }),
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
        cartItems:        state.cartItems,
        customerEmail:    state.customerEmail,
      }),
      // After rehydration, restore uploadSlots from selectedTemplate
      // (they were excluded because File objects aren't JSON-serialisable,
      //  but the slot definitions themselves are safe to restore).
      onRehydrateStorage: () => (state) => {
        if (state?.selectedTemplate) {
          const seenTypes = new Set<string>();
          state.uploadSlots = state.selectedTemplate.uploadSlots.map((slot) => {
            const base = { ...slot, file: undefined, previewUrl: undefined };
            if (slot.type !== "person" && slot.type !== "pet") return base;
            if (!seenTypes.has(slot.type)) { seenTypes.add(slot.type); return base; }
            return { ...base, required: false };
          });
        }
      },
    }
  )
);
