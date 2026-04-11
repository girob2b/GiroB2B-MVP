import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Globe, MapPin, MessageSquare, Phone } from "lucide-react";

export const metadata = { title: "Perfil do Fornecedor" };

type PublicBlockKey = "hero" | "about" | "gallery" | "products" | "contact";
type PublicBlock = { key: PublicBlockKey; enabled: boolean };

const DEFAULT_LAYOUT: PublicBlock[] = [
  { key: "hero", enabled: true },
  { key: "about", enabled: true },
  { key: "gallery", enabled: true },
  { key: "products", enabled: true },
  { key: "contact", enabled: true },
];

interface SupplierPublicRow {
  id: string;
  trade_name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  founded_year: number | null;
  employee_count: string | null;
  operating_hours: string | null;
  categories: string[] | null;
  photos: string[] | null;
  plan: string | null;
  is_verified: boolean;
  public_profile_layout?: unknown | null;
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[] | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
}

function isPublicBlockKey(key: unknown): key is PublicBlockKey {
  return key === "hero" || key === "about" || key === "gallery" || key === "products" || key === "contact";
}

function isMissingColumnError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "PGRST204"
  );
}

function normalizeLayout(raw: unknown): PublicBlock[] {
  if (!Array.isArray(raw)) return DEFAULT_LAYOUT;

  const next: PublicBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as { key?: unknown; enabled?: unknown };
    const key = record.key;
    const enabled = record.enabled;
    if (isPublicBlockKey(key)) {
      next.push({ key, enabled: enabled !== false });
    }
  }
  return next.length ? next : DEFAULT_LAYOUT;
}

function formatPhoneForWhatsApp(phone: string) {
  return phone.replace(/\D/g, "");
}

export default async function FornecedorPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const supplierSelectBase =
    "id, trade_name, slug, description, logo_url, phone, whatsapp, address, city, state, website, instagram, linkedin, founded_year, employee_count, operating_hours, categories, photos, plan, is_verified";
  const supplierSelectWithLayout = `${supplierSelectBase}, public_profile_layout`;

  let supplierRes = await supabase
    .from("suppliers")
    .select(supplierSelectWithLayout)
    .eq("slug", slug)
    .eq("suspended", false)
    .maybeSingle();

  if (supplierRes.error && isMissingColumnError(supplierRes.error)) {
    supplierRes = await supabase
      .from("suppliers")
      .select(supplierSelectBase)
      .eq("slug", slug)
      .eq("suspended", false)
      .maybeSingle();
  }

  const supplier = supplierRes.data as SupplierPublicRow | null;

  if (!supplier) notFound();

  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, slug, description, images, price_min_cents, price_max_cents")
    .eq("supplier_id", supplier.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(12);

  const products = (productsData as ProductRow[] | null) ?? [];
  const layout = normalizeLayout(supplier.public_profile_layout).filter((b) => b.enabled);
  const categories = supplier.categories ?? [];
  const photos = supplier.photos ?? [];
  const locationLabel =
    [supplier.city, supplier.state].filter((v) => typeof v === "string" && v.trim().length > 0).join(" / ") ||
    "Brasil";

  const { data: categoriesData } = categories.length
    ? await supabase
        .from("categories")
        .select("id, name")
        .in("id", categories)
    : { data: [] as Array<{ id: string; name: string }> };

  const categoryNameById = new Map<string, string>(
    ((categoriesData as Array<{ id: string; name: string }> | null) ?? []).map((c) => [c.id, c.name])
  );

  const header = (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--brand-green-50),transparent_60%)]" />
      <div className="relative p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-20 h-20 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center overflow-hidden">
            {supplier.logo_url ? (
              <Image
                src={supplier.logo_url}
                alt={supplier.trade_name}
                width={80}
                height={80}
                className="w-20 h-20 object-contain"
                unoptimized
              />
            ) : (
              <div className="text-slate-400 font-bold text-xl">
                {(supplier.trade_name ?? "G").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 truncate">{supplier.trade_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-xl border-slate-200 text-slate-700">
                <MapPin className="w-3 h-3" /> {locationLabel}
              </Badge>
              {supplier.is_verified && (
                <Badge className="rounded-xl bg-[color:var(--brand-green-600)] text-white">
                  Verificado
                </Badge>
              )}
              {supplier.plan && (
                <Badge variant="secondary" className="rounded-xl">
                  Plano {supplier.plan}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:ml-auto">
          {supplier.whatsapp && (
            <Button
              render={
                <Link
                  href={`https://wa.me/${formatPhoneForWhatsApp(supplier.whatsapp)}?text=${encodeURIComponent(
                    `Olá! Vi seu perfil na GiroB2B. Gostaria de falar sobre produtos.`
                  )}`}
                  target="_blank"
                />
              }
              className="btn-primary rounded-xl h-11 px-6"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Falar no WhatsApp
            </Button>
          )}
          {supplier.website && (
            <Button
              render={<Link href={supplier.website} target="_blank" />}
              className="btn-secondary rounded-xl h-11 px-6"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Site
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const about = (
    <Card className="border-slate-200 rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/30">
        <CardTitle className="text-lg font-bold">Sobre</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {supplier.description ? (
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">{supplier.description}</p>
        ) : (
          <p className="text-slate-500">Este fornecedor ainda não adicionou uma descrição.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {supplier.founded_year && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Fundação</div>
              <div className="mt-1 text-slate-900 font-bold">{supplier.founded_year}</div>
            </div>
          )}
          {supplier.employee_count && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Equipe</div>
              <div className="mt-1 text-slate-900 font-bold">{supplier.employee_count}</div>
            </div>
          )}
          {supplier.operating_hours && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Horário</div>
              <div className="mt-1 text-slate-900 font-bold">{supplier.operating_hours}</div>
            </div>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((id) => (
              <Badge key={id} variant="outline" className="rounded-xl border-[color:var(--brand-green-200)] text-[color:var(--brand-green-700)] bg-[color:var(--brand-green-50)]">
                {categoryNameById.get(id) ?? id}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const gallery = (
    <Card className="border-slate-200 rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/30">
        <CardTitle className="text-lg font-bold">Galeria</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {photos.length === 0 ? (
          <p className="text-slate-500">Este fornecedor ainda não adicionou fotos.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.slice(0, 8).map((url) => (
              <div key={url} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <Image src={url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const productsBlock = (
    <Card className="border-slate-200 rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/30">
        <CardTitle className="text-lg font-bold">Produtos em destaque</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {products.length === 0 ? (
          <p className="text-slate-500">Este fornecedor ainda não publicou produtos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-40 bg-slate-50">
                  {p.images?.[0] ? (
                    <Image src={p.images[0]} alt={p.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300 font-bold">Produto</div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="font-bold text-slate-900 line-clamp-1">{p.name}</div>
                  {p.description && <div className="text-sm text-slate-500 line-clamp-2">{p.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const contact = (
    <Card className="border-slate-200 rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/30">
        <CardTitle className="text-lg font-bold">Contato</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {supplier.phone && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700">{supplier.phone}</span>
            </div>
          )}
          {supplier.website && (
            <Link href={supplier.website} target="_blank" className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
              <Globe className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700 truncate">{supplier.website}</span>
            </Link>
          )}
          {supplier.instagram && (
            <Link href={supplier.instagram} target="_blank" className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700 truncate">{supplier.instagram}</span>
            </Link>
          )}
          {supplier.linkedin && (
            <Link href={supplier.linkedin} target="_blank" className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700 truncate">{supplier.linkedin}</span>
            </Link>
          )}
        </div>
        {supplier.address && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-700">{supplier.address}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const blockMap = {
    hero: header,
    about,
    gallery,
    products: productsBlock,
    contact,
  } as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        {layout.map((b) => (
          <div key={b.key}>{blockMap[b.key]}</div>
        ))}
      </div>
    </div>
  );
}
