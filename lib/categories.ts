export type Category = {
  slug: string;
  name: string;
  kicker: string;
  description: string;
  image: string;
  imageAlt: string;
  photoCredit: string;
  photoSource: string;
  lineup: string[];
  live: boolean;
};

export const categories: Category[] = [
  {
    slug: "portable-speakers",
    name: "Portable Speakers",
    kicker: "Audio on the move",
    description: "Compare battery life, durability, weight, sound features, and value.",
    image: "/products/category-portable-speakers-2026.jpg",
    imageAlt: "Blue JBL Charge 6 portable speaker carried beside a BMX bike",
    photoCredit: "JBL",
    photoSource: "https://news.jbl.com/en-CEU/247222-jbl-unleashes-next-generation-flip-7-and-charge-6-with-bigger-sound-and-deeper-bass/",
    lineup: ["JBL Charge 6", "JBL Flip 7", "Bose SoundLink Max", "UE EVERBOOM", "Beats Pill"],
    live: true,
  },
  {
    slug: "smartphones",
    name: "Smartphones",
    kicker: "Pocket power",
    description: "Compare sourced display, storage, charging, camera, and software specifications.",
    image: "/products/category-smartphones-2026.jpg",
    imageAlt: "Blue and silver Samsung Galaxy S25 smartphones",
    photoCredit: "Samsung",
    photoSource: "https://samsungmobilepress.com/articles/samsung-galaxy-s25-series-sets-the-standard-of-ai-phone-as-a-true-ai-companion",
    lineup: ["iPhone 17 Pro", "Samsung Galaxy S26 Ultra", "Google Pixel 10 Pro"],
    live: true,
  },
  {
    slug: "vr-headsets",
    name: "VR Headsets",
    kicker: "Step inside",
    description: "Compare display clarity, tracking, comfort, game libraries, battery life, and value.",
    image: "/products/category-vr-headsets-2026.jpg",
    imageAlt: "Apple Vision Pro mixed-reality headset",
    photoCredit: "Apple",
    photoSource: "https://www.apple.com/newsroom/2023/06/introducing-apple-vision-pro/",
    lineup: ["Meta Quest 3", "Apple Vision Pro", "Samsung Galaxy XR", "PlayStation VR2", "Pimax Dream Air"],
    live: true,
  },
  {
    slug: "wearables",
    name: "Wearables",
    kicker: "Tech that moves",
    description: "Compare health features, sensors, battery life, durability, compatibility, and comfort.",
    image: "/products/category-wearables-2026.jpg",
    imageAlt: "Black Apple Watch Ultra 2 with a blue watch face",
    photoCredit: "Apple",
    photoSource: "https://www.apple.com/newsroom/2024/09/apple-watch-ultra-2-now-available-in-black-titanium/",
    lineup: ["Apple Watch Series 12", "Apple Watch Ultra 4", "Pixel Watch 5", "Galaxy Watch9", "Oura Ring 5"],
    live: true,
  },
  {
    slug: "headphones",
    name: "Headphones",
    kicker: "Hear the difference",
    description: "Compare noise cancellation, sound, comfort, microphones, battery life, and portability.",
    image: "/products/category-headphones-2026.jpg",
    imageAlt: "Sony WH-1000XM6 headphones beside a studio mixing console",
    photoCredit: "Sony",
    photoSource: "https://electronics.sony.com/audio/headphones/headband/p/wh1000xm6-b",
    lineup: ["Sony WH-1000XM6", "Bose QuietComfort Ultra Headphones (2nd Gen)", "AirPods Max 2", "Beats Studio Pro", "JBL Tour One M3"],
    live: true,
  },
  {
    slug: "game-consoles",
    name: "Game Consoles",
    kicker: "Choose your player",
    description: "Compare price, storage, portability, display or TV output, expansion, and ownership trade-offs.",
    image: "/products/category-game-consoles-2026.jpg",
    imageAlt: "White PlayStation 5 Pro console and DualSense controller on a blue background",
    photoCredit: "Sony Interactive Entertainment",
    photoSource: "https://www.playstation.com/en-us/ps5/ps5-pro/",
    lineup: ["PlayStation 5 Pro", "Xbox Series X", "Nintendo Switch 2", "Steam Deck OLED", "ROG Xbox Ally X"],
    live: true,
  },
];

export const getCategory = (slug: string) => categories.find((category) => category.slug === slug);
