import { randomUUID } from "node:crypto";
import { createAdminClient } from "./supabase.js";

const PRODUCT_IMAGES_BUCKET = "product-images";

function inferExtension(contentType: string | null, fallbackUrl: string): string {
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  const urlExt = fallbackUrl.split(".").pop()?.toLowerCase().split("?")[0];
  if (urlExt && ["jpg", "jpeg", "png", "webp"].includes(urlExt)) {
    return urlExt === "jpeg" ? "jpg" : urlExt;
  }
  return "jpg";
}

/**
 * Baixa uma imagem (de URL pública) e re-envia pro bucket product-images
 * num caminho pertencente ao supplier de destino. Retorna a nova URL pública.
 */
export async function copyImageToBucket(sourceUrl: string, targetSupplierId: string): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem original (HTTP ${response.status}).`);
  }

  const contentType = response.headers.get("content-type");
  const ext = inferExtension(contentType, sourceUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const path = `${targetSupplierId}/${randomUUID()}.${ext}`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, buffer, {
      contentType: contentType ?? `image/${ext}`,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Falha ao salvar imagem importada: ${uploadError.message}`);
  }

  const { data } = admin.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
