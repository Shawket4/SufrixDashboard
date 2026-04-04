import client from "@/lib/client";
import type { DrinkRecipe, AddonIngredient } from "@/types";

export const getDrinkRecipes     = (menuItemId: string)                                    => client.get<DrinkRecipe[]>(`/recipes/drinks/${menuItemId}`);
export const upsertDrinkRecipe   = (menuItemId: string, data: Record<string, unknown>)     => client.post<DrinkRecipe>(`/recipes/drinks/${menuItemId}`, data);
export const deleteDrinkRecipe = (itemId: string, size: string, ingredientName: string) =>
  client.delete(`/recipes/drinks/${itemId}/${size}`, { params: { ingredient_name: ingredientName } });

export const getAddonIngredients   = (addonItemId: string)                                 => client.get<AddonIngredient[]>(`/recipes/addons/${addonItemId}`);
export const upsertAddonIngredient = (addonItemId: string, data: Record<string, unknown>)  => client.post<AddonIngredient>(`/recipes/addons/${addonItemId}`, data);


export const deleteAddonIngredient = (addonId: string, ingredientName: string) =>
  client.delete(`/recipes/addons/${addonId}`, { params: { ingredient_name: ingredientName } });
