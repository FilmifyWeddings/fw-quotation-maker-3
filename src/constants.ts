import { DesignSettings, QuotationState } from "./types";

export const DEFAULT_DESIGN: DesignSettings = {
  primaryFont: "'Playfair Display', serif",
  secondaryFont: "'Montserrat', sans-serif",
  accentColor: "#5a5646",
  logoUrl: "https://filmifyweddings.com/wp-content/uploads/2023/10/FILMIFY-WEDDINGS-LOGO-01.png",
  fontScale: 1
};

export const DEFAULT_QUOTATION: Omit<QuotationState, "userId" | "createdAt"> = {
  clientName: "SHUBHAMKAR",
  finalAmount: 175000,
  designSettings: DEFAULT_DESIGN,
  preWeddingDeliverables: [
    "Full Ultra HD Super-Fine Raw Photos",
    "Approx. 50 High Resolution Edited Images",
    "3 Save The Dates Photos",
    "3-4 Minute Pre-wedding Film",
    "Pre-wedding Teaser",
    "Pre-wedding Insta Reel",
    "Candid Photography",
    "Jaw-dropping Cinematography",
    "Portable Changing Room"
  ],
  functions: [
    {
      date: "25 JAN",
      name: "GUDDAANA",
      time: "10:00 AM TO 12:00 PM",
      services: ["Traditional Photography"]
    },
    {
      date: "26 JAN",
      name: "BRIDE HALDI",
      time: "8:00 AM TO 3:00 PM",
      services: ["Traditional Photography", "Professional Traditional Videography"]
    },
    {
      date: "26 JAN",
      name: "SANGEET",
      time: "6:00 PM TO 11:00 PM",
      services: ["Traditional Photography", "Professional Traditional Videography", "Jaw-dropping Cinematography"]
    },
    {
      date: "27 JAN",
      name: "WEDDING",
      time: "3:00 PM TO 11:00 PM",
      services: ["Traditional Photography", "Professional Traditional Videography", "Candid Photography", "Jaw-dropping Cinematography", "Drone"]
    }
  ],
  finalDeliverables: [
    "All the ULTRA FHD Raw Photos will be delivered.",
    "Best Selected Manual HD Edited Photos.",
    "Jaw-dropping Cinematic Wedding Film. (Combined of all events)",
    "Wedding Teaser.",
    "Wedding Insta Reel.",
    "Individual FAMILY PORTFOLIOS.",
    "Traditional Full Length Video of Each Event Separate.",
    "One Year Data Drive Access.",
    "Indigo Photobooks of total 30 Sheets (200 Photos approx in total) with HD Prints.",
    "Wedding Album size will be 12x36 inches with Mate and Glossy Diamond Coated HD Prints.",
    "Mini Album Book",
    "One Photobook Calendar."
  ],
  bankDetails: {
    accountName: "FILMIFY WEDDINGS",
    accountNumber: "8447210426",
    ifscCode: "KKBK0000670",
    accountType: "CURRENT ACCOUNT",
    upiId: "+91 7400341574"
  },
  coverImage: "https://images.unsplash.com/photo-1542045890-484196d42f53?auto=format&fit=crop&q=80&w=1200",
  customImages: [],
  customTextBlocks: []
};

export const TERMS_AND_CONDITIONS = [
  {
    title: "About Photoshoot:",
    items: [
      "Bride & Groom Portfolio: Allow 40-45 minutes for the couple's portfolio, to be completed before the wedding ceremony.",
      "Event Coverage: Our coverage extends till the wedding hall/location. Home Entry, Home Puja, etc., are not included.",
      "Introduction & Briefing: Please brief our team about important family members and key locations before the shoot for smooth execution.",
      "Social Media Usage: We reserve the right to share photos/videos on our social media with your permission.",
      "Photography-Friendly Environment: Proper lighting arrangements at the venue will help us capture the best moments beautifully.",
      "Schedule Changes: Kindly inform us in advance about any schedule changes or delays."
    ]
  },
  {
    title: "About Deliverables:",
    items: [
      "Best Edited Photos will be shared within a few days after the wedding.",
      "All Photo deliverables will be sent within 3 to 4 weeks, only after clearing outstanding dues.",
      "Traditional Video Delivery takes at least 5 weeks or more.",
      "Cinematic Video Editing requires at least 7-8 weeks, after song approval.",
      "RAW Video files will NOT be provided."
    ]
  },
  {
    title: "About Album:",
    items: [
      "Final photo selection for the album must be completed by the client.",
      "Album designing takes a minimum of 1 month after selection.",
      "Only ONE revision in the album design is allowed before printing.",
      "Photos for the album must be selected within 6 months from the event date; beyond that, extra charges will apply."
    ]
  }
];

export const BLANK_QUOTATION: Omit<QuotationState, "userId" | "createdAt"> = {
  clientName: "SURNAME",
  finalAmount: 0,
  designSettings: DEFAULT_DESIGN,
  preWeddingDeliverables: [],
  functions: [],
  finalDeliverables: [],
  coverImage: "",
  customImages: [],
  customTextBlocks: [],
  bankDetails: {
    accountName: "FILMIFY WEDDINGS",
    accountNumber: "",
    ifscCode: "",
    accountType: "CURRENT ACCOUNT",
    upiId: ""
  }
};

export const POLICY_SECTIONS = [
  {
    title: "About Video Editing:",
    items: [
      "We constantly explore new trends to enhance our work. If you have specific editing requests, please inform us immediately after the shoot.",
      "Cinematic Film: Only one-time minor changes are allowed.",
      "Traditional Video: No changes will be made after final delivery.",
      "No changes will be accepted in Reels & Teasers.",
      "Any song change requests made after the editing process begins cannot be accommodated without a complete re-edit."
    ]
  },
  {
    title: "Payment Policy:",
    items: [
      "Advance payments are non-refundable if an event is canceled.",
      "If an event is postponed, the paid amount can be redeemed within one year.",
      "Additional charges will apply if the shoot extends beyond the agreed time."
    ]
  }
];
