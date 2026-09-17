import { smartphoneFields, isSmartphonePreset } from "@/lib/smartphone-specs";
import { headphoneFields, type HeadphoneSpecKey } from "@/lib/headphone-specs";
import { isHeadphonePreset } from "@/lib/verdicts";
import { extendedCategoryModels,isExtendedCategory } from "@/lib/extended-category-specs";

export const voteDimensionTypes = ["overall", "attribute", "use_case"] as const;
export type VoteDimensionType = (typeof voteDimensionTypes)[number];

export type VoteDimension = {
  type: VoteDimensionType;
  key: string;
};

export const voteableHeadphoneAttributes = headphoneFields
  .filter((field) => field.scorable && field.comparisonRule !== "none" && field.comparisonRule !== "categorical")
  .map((field) => field.key);

export function normalizeVoteDimension(type: string | null | undefined, key: string | null | undefined, categorySlug: string | null) : VoteDimension | null {
  if (!type || type === "overall") return { type: "overall", key: "overall" };
  if (categorySlug === "smartphones") {
    if (type === "use_case" && key && isSmartphonePreset(key)) return {type,key};
    if (type === "attribute" && key && smartphoneFields.some((field)=>field.key === key && field.direction)) return {type,key};
    return null;
  }
  if(categorySlug && isExtendedCategory(categorySlug)){
    const model=extendedCategoryModels[categorySlug];
    if(type==="use_case"&&key&&Object.hasOwn(model.presets,key))return{type,key};
    if(type==="attribute"&&key&&model.fields.some((field)=>field.key===key&&field.direction))return{type,key};
    return null;
  }
  if (categorySlug !== "headphones") return null;
  if (type === "use_case" && key && isHeadphonePreset(key)) return { type, key };
  if (type === "attribute" && key && voteableHeadphoneAttributes.includes(key as HeadphoneSpecKey)) return { type, key };
  return null;
}

export function voteDimensionLabel(dimension: VoteDimension) {
  if (dimension.type === "overall") return "Overall winner";
  if (dimension.type === "use_case") return `${dimension.key.replaceAll("_", " ")} pick`;
  return headphoneFields.find((field) => field.key === dimension.key)?.label ?? "Attribute winner";
}
