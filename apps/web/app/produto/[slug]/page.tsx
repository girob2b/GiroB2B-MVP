import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Package as PackageIcon, ArrowRight } from "lucide-react";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[] | null;
  unit: string | null;
  min_order: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  category_id: string | null;
  supplier_id: string;
}

interface SupplierRow {
  id: string;
  slug: string;
  trade_name: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
}

function formatPrice(cents: number | null) {
  if (cents == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function buildPriceLabel(min: number | null, max: number | null) {
  const lo = formatPrice(min);
  const hi = formatPrice(max);
  if (lo && hi && min !== max) return `${lo} – ${hi}`;
  if (lo) return lo;
  if (hi) return hi;
  return "Sob consulta";
}

async function loadProduct(slug: string) {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, images, unit, min_order, price_min_cents, price_max_cents, category_id, supplier_id"
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!product) return null;

  const productRow = product as ProductRow;

  const [{ data: supplier }, categoryRes] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, slug, trade_name, description, logo_url, city, state")
      .eq("id", productRow.supplier_id)
      .eq("suspended", false)
      .maybeSingle(),
    productRow.category_id
      ? supabase
          .from("categories")
          .select("id, name")
          .eq("id", productRow.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!supplier) return null;

  return {
    product: productRow,
    supplier: supplier as SupplierRow,
    category: (categoryRes.data ?? null) as CategoryRow | null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadProduct(slug);
  if (!data) return { title: "Produto não encontrado" };

  const { product, supplier } = data;
  const title = `${product.name} — ${supplier.trade_name}`;
  const description =
    product.description?.slice(0, 160) ??
    `${product.name} fornecido por ${supplier.trade_name}. Peça uma cotação B2B direta no GiroB2B.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: product.images?.[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProdutoPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadProduct(slug);
  if (!data) notFound();

  const { product, supplier, category } = data;
  const image = product.images?.[0];
  const priceLabel = buildPriceLabel(product.price_min_cents, product.price_max_cents);
  const location =
    [supplier.city, supplier.state].filter((v) => v && v.trim().length > 0).join(" / ") || "Brasil";

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/explorar" className="hover:text-foreground transition-colors">
          Explorar
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <PackageIcon className="w-12 h-12 opacity-40" />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {category && (
            <Badge variant="secondary" className="uppercase tracking-wider">
              {category.name}
            </Badge>
          )}

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              {product.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Fornecido por{" "}
              <Link
                href={`/fornecedor/${supplier.slug}`}
                className="font-medium text-foreground hover:underline"
              >
                {supplier.trade_name}
              </Link>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <p className="text-sm text-muted-foreground">Faixa de preço</p>
            <p className="text-2xl font-bold text-slate-900">{priceLabel}</p>
            {product.unit && (
              <p className="text-sm text-muted-foreground">por {product.unit}</p>
            )}
            {product.min_order && (
              <p className="text-sm text-muted-foreground">
                Pedido mínimo: {product.min_order} {product.unit ?? "unidades"}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              render={<Link href={`/fornecedor/${supplier.slug}#contato`} />}
              size="lg"
              className="flex-1"
            >
              Pedir cotação
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              render={<Link href={`/fornecedor/${supplier.slug}`} />}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              Ver fornecedor
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {location}
          </div>
        </div>
      </div>

      {product.description && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Descrição</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {product.description}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
              {supplier.logo_url ? (
                <Image
                  src={supplier.logo_url}
                  alt={supplier.trade_name}
                  width={64}
                  height={64}
                  className="object-contain"
                />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">
                  {supplier.trade_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{supplier.trade_name}</p>
              {supplier.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{supplier.description}</p>
              )}
            </div>
          </div>
          <Button render={<Link href={`/fornecedor/${supplier.slug}`} />} variant="outline">
            Conhecer fornecedor
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
