import { ProductModel3D } from "@/app/(store)/product/[id]/product-model3d";
import { publicUrl } from "@/env.mjs";
import { getLocale, getTranslations } from "@/i18n/server";
import { getRecommendedProducts } from "@/lib/search/trieve";
import { deslugify, formatMoney } from "@/lib/utils";
import type { TrieveProductMetadata } from "@/scripts/upload-trieve";
import { AddToCartButton } from "@/ui/add-to-cart-button";
import { JsonLd, mappedProductToJsonLd } from "@/ui/json-ld";
import { Markdown } from "@/ui/markdown";
import { MainProductImage } from "@/ui/products/main-product-image";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/ui/shadcn/breadcrumb";
import { StickyBottom } from "@/ui/sticky-bottom";
import { YnsLink } from "@/ui/yns-link";
import * as Commerce from "commerce-kit";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function SingleProductPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = await props.params;
	const product = await Commerce.productGetById(params.id);

	if (!product) {
		return notFound();
	}

	const t = await getTranslations("/product.page");
	const locale = await getLocale();

	const category = product.metadata.category;

	return (
		<article className="pb-12">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild className="inline-flex min-h-12 min-w-12 items-center justify-center">
							<YnsLink href="/products">{t("allProducts")}</YnsLink>
						</BreadcrumbLink>
					</BreadcrumbItem>
					{category && (
						<>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink className="inline-flex min-h-12 min-w-12 items-center justify-center" asChild>
									<YnsLink href={`/category/${category}`}>{deslugify(category)}</YnsLink>
								</BreadcrumbLink>
							</BreadcrumbItem>
						</>
					)}
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{product.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<StickyBottom product={product} locale={locale}>
				<div className="mt-4 grid gap-4 lg:grid-cols-12">
					<div className="lg:col-span-5 lg:col-start-8">
						<h1 className="text-3xl font-bold leading-none tracking-tight text-foreground">{product.name}</h1>
						{product.default_price.unit_amount && (
							<p className="mt-2 text-2xl font-medium leading-none tracking-tight text-foreground/70">
								{formatMoney({
									amount: product.default_price.unit_amount,
									currency: product.default_price.currency,
									locale,
								})}
							</p>
						)}
						<div className="mt-2">{product.metadata.stock <= 0 && <div>Out of stock</div>}</div>
					</div>

					<div className="lg:col-span-7 lg:row-span-3 lg:row-start-1">
						<h2 className="sr-only">{t("imagesTitle")}</h2>

						<div className="grid gap-4 lg:grid-cols-3 [&>*:first-child]:col-span-3">
							{product.metadata.preview && (
								<ProductModel3D model3d={product.metadata.preview} imageSrc={product.images[0]} />
							)}
							{product.images.map((image, idx) =>
								idx === 0 && !product.metadata.preview ? (
									<MainProductImage
										key={image}
										className="w-full rounded-lg bg-neutral-100 object-cover object-center transition-opacity"
										src={image}
										loading="eager"
										priority
										alt=""
									/>
								) : (
									<Image
										key={image}
										className="w-full rounded-lg bg-neutral-100 object-cover object-center transition-opacity"
										src={image}
										width={700 / 3}
										height={700 / 3}
										sizes="(max-width: 1024x) 33vw, (max-width: 1280px) 20vw, 225px"
										loading="eager"
										priority
										alt=""
									/>
								),
							)}
						</div>
					</div>

					<div className="grid gap-8 lg:col-span-5">
						<section>
							<h2 className="sr-only">{t("descriptionTitle")}</h2>
							<div className="prose text-secondary-foreground">
								<Markdown source={product.description || ""} />
							</div>
						</section>

						<AddToCartButton productId={product.id} disabled={product.metadata.stock <= 0} />
					</div>
				</div>
			</StickyBottom>

			<Suspense>
				<SimilarProducts id={product.id} />
			</Suspense>

			<JsonLd jsonLd={mappedProductToJsonLd(product)} />
		</article>
	);
}

async function SimilarProducts({ id }: { id: string }) {
	const products = await getRecommendedProducts({ productId: id, limit: 4 });

	if (!products) {
		return null;
	}

	return (
		<section className="py-12">
			<div className="mb-8">
				<h2 className="text-2xl font-bold tracking-tight">You May Also Like</h2>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{products.map((product) => {
					const trieveMetadata = product.metadata as TrieveProductMetadata;
					return (
						<div key={product.tracking_id} className="bg-card rounded overflow-hidden shadow group">
							{trieveMetadata.image_url && (
								<YnsLink href={`${publicUrl}${product.link}`} className="block" prefetch={false}>
									<Image
										className={
											"w-full rounded-lg bg-neutral-100 object-cover object-center group-hover:opacity-80 transition-opacity"
										}
										src={trieveMetadata.image_url}
										width={300}
										height={300}
										sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 300px"
										alt=""
									/>
								</YnsLink>
							)}
							<div className="p-4">
								<h3 className="text-lg font-semibold mb-2">
									<YnsLink href={product.link || "#"} className="hover:text-primary" prefetch={false}>
										{trieveMetadata.name}
									</YnsLink>
								</h3>
								<div className="flex items-center justify-between">
									<span>
										{formatMoney({
											amount: trieveMetadata.amount,
											currency: trieveMetadata.currency,
										})}
									</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}