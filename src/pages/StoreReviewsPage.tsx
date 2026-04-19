import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedPurchaseBadge } from '@/components/reviews/VerifiedPurchaseBadge';
import { cn } from '@/lib/utils';
import { 
 ArrowLeft, 
 Star, 
 Store as StoreIcon,
 MessageSquare,
 TrendingUp,
 Filter
} from 'lucide-react';
import { format } from '@/lib/dateUtils';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { usePublicStore } from '@/hooks/usePublicStore';
import { usePublicReviews } from '@/hooks/usePublicReviews';
import { useStoreTheme } from '@/hooks/useStoreTheme';
import { StoreNotFound } from '@/components/store/StoreNotFound';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function StoreReviewsPage() {
 const { storeSlug } = useParams<{ storeSlug: string }>();
 const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');
 const [filterRating, setFilterRating] = useState<string>('all');

 // Fetch store details via centralised hook
 const { store, isLoading: storeLoading, notFound } = usePublicStore(storeSlug);

 usePageMeta({
   title: store ? `${store.name} Reviews` : 'Store Reviews',
   description: store ? `Read verified buyer reviews of ${store.name} on Eclipse — see ratings, customer feedback and trust signals.` : undefined,
   canonicalPath: storeSlug ? `/store/${storeSlug}/reviews` : undefined,
   ogImage: store?.logo_url || undefined,
 });

 // Fetch all reviews via centralised hook
 const { reviews, isLoading: reviewsLoading } = usePublicReviews({
 type: 'store',
 storeId: store?.id,
 });

 const totalReviews = reviews?.length || 0;

 const hasActiveFilters = filterRating !== 'all' || sortBy !== 'recent';
 const clearFilters = () => {
 setFilterRating('all');
 setSortBy('recent');
 };

 const filteredReviews = useMemo(() => {
 if (!reviews) return [];

 let result = [...reviews];

 if (filterRating !== 'all') {
 const parsed = Number.parseInt(filterRating, 10);
 if (!Number.isNaN(parsed)) {
 result = result.filter((r) => r.rating === parsed);
 }
 }

 switch (sortBy) {
 case 'highest':
 result.sort((a, b) => b.rating - a.rating);
 break;
 case 'lowest':
 result.sort((a, b) => a.rating - b.rating);
 break;
 case 'recent':
 default:
 result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
 break;
 }

 return result;
 }, [reviews, filterRating, sortBy]);

 // Calculate rating distribution
 const ratingDistribution = reviews?.reduce((acc, review) => {
 acc[review.rating] = (acc[review.rating] || 0) + 1;
 return acc;
 }, {} as Record<number, number>) || {};

 const { accentColor } = useStoreTheme(store);

 if (storeLoading) {
 return (
 <MainLayout>
 <div className="container py-8 px-4">
 <Skeleton className="h-8 w-48 mb-6" />
 <div className="space-y-4">
 {[1, 2, 3].map(i => (
 <Skeleton key={i} className="h-32" />
 ))}
 </div>
 </div>
 </MainLayout>
 );
 }

 if (notFound) {
 return <StoreNotFound />;
 }

 return (
 <MainLayout>
 <div className="container py-6 px-4 max-w-4xl">
 {/* Header */}
 <div className="flex items-center gap-4 mb-6">
 <Button variant="ghost" size="icon" aria-label="Go back" asChild>
 <Link to={`/store/${storeSlug}`}>
 <ArrowLeft className="h-5 w-5" />
 </Link>
 </Button>
 <div className="flex items-center gap-3">
 {store.logo_url ? (
 <img 
 src={store.logo_url} 
 alt={store.name}
 className="h-10 w-10 object-contain"
 />
 ) : (
 <div 
 className="h-10 w-10 rounded-lg flex items-center justify-center"
 style={{ backgroundColor: `${accentColor}20` }}
 >
 <StoreIcon className="h-5 w-5" style={{ color: accentColor }} />
 </div>
 )}
 <div>
 <h1 className="text-xl font-bold">{store.name} Reviews</h1>
 <p className="text-sm text-muted-foreground">
 {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
 </p>
 </div>
 </div>
 </div>

 {/* Stats Card */}
 <div className="border border-border rounded-xl overflow-hidden mb-6" style={{ borderColor: `${accentColor}30` }}>
 <div className="p-4">
 <div className="flex flex-col md:flex-row gap-6">
 {/* Average Rating */}
 <div className="flex items-center gap-4">
 <div 
 className="h-16 w-16 rounded-xl flex items-center justify-center"
 style={{ backgroundColor: `${accentColor}20` }}
 >
 <span className="text-2xl font-bold" style={{ color: accentColor }}>
 {store.average_rating?.toFixed(1) || '—'}
 </span>
 </div>
 <div>
 <div className="flex items-center gap-1 mb-1">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 className="h-4 w-4"
 fill={star <= Math.round(store.average_rating || 0) ? accentColor : 'transparent'}
 stroke={star <= Math.round(store.average_rating || 0) ? accentColor : 'currentColor'}
 />
 ))}
 </div>
 <p className="text-sm text-muted-foreground">
 Based on {totalReviews} reviews
 </p>
 </div>
 </div>

 {/* Rating Distribution */}
 <div className="flex-1 space-y-1.5">
 {[5, 4, 3, 2, 1].map((rating) => {
 const count = ratingDistribution[rating] || 0;
 const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
 const isActive = filterRating === String(rating);
 return (
 <button
 key={rating}
 type="button"
 onClick={() => setFilterRating(isActive ? 'all' : String(rating))}
 className={cn(
 "flex items-center gap-2 text-sm w-full rounded-md px-1 py-1 transition-colors",
 isActive ? "bg-primary/10" : "hover:bg-muted/50",
 )}
 aria-pressed={isActive}
 >
 <span className="w-3">{rating}</span>
 <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
 <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
 <div 
 className="h-full rounded-full transition-all duration-500"
 style={{ 
 width: `${percentage}%`,
 backgroundColor: accentColor 
 }}
 />
 </div>
 <span className="w-8 text-muted-foreground text-xs">
 {count}
 </span>
 </button>
 );
 })}
 </div>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-wrap gap-3 mb-6">
 <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
 <SelectTrigger className="w-[140px]">
 <TrendingUp className="h-4 w-4 mr-2" />
 <SelectValue placeholder="Sort by" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="recent">Most Recent</SelectItem>
 <SelectItem value="highest">Highest Rated</SelectItem>
 <SelectItem value="lowest">Lowest Rated</SelectItem>
 </SelectContent>
 </Select>

 <Select value={filterRating} onValueChange={setFilterRating}>
 <SelectTrigger className="w-[140px]">
 <Filter className="h-4 w-4 mr-2" />
 <SelectValue placeholder="Filter" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Ratings</SelectItem>
 <SelectItem value="5">5 Stars</SelectItem>
 <SelectItem value="4">4 Stars</SelectItem>
 <SelectItem value="3">3 Stars</SelectItem>
 <SelectItem value="2">2 Stars</SelectItem>
 <SelectItem value="1">1 Star</SelectItem>
 </SelectContent>
 </Select>

 {hasActiveFilters && (
 <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
 Clear
 </Button>
 )}
 </div>

 {totalReviews > 0 && hasActiveFilters && (
 <p className="text-sm text-muted-foreground mb-4">
 Showing {filteredReviews.length} of {totalReviews} reviews
 </p>
 )}

 {/* Reviews List */}
 {reviewsLoading ? (
 <div className="space-y-4">
 {[1, 2, 3].map(i => (
 <Skeleton key={i} className="h-32" />
 ))}
 </div>
 ) : filteredReviews.length > 0 ? (
 <div className="space-y-4">
 {filteredReviews.map((review) => (
 <div key={review.id} className="overflow-hidden">
 <div className="p-4 p-4">
 <div className="flex items-start gap-3">
 <Avatar className="h-10 w-10">
 <AvatarImage src={review.profile?.avatar_url || undefined} />
 <AvatarFallback>
 {review.profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
 </AvatarFallback>
 </Avatar>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <span className="font-medium">
 {review.profile?.display_name || 'Anonymous'}
 </span>
 {review.is_verified_purchase && <VerifiedPurchaseBadge />}
 </div>
 <div className="flex items-center gap-2 mb-2">
 <div className="flex">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 className="h-3.5 w-3.5"
 fill={star <= review.rating ? '#facc15' : 'transparent'}
 stroke={star <= review.rating ? '#facc15' : 'currentColor'}
 />
 ))}
 </div>
 <span className="text-xs text-muted-foreground">
 {format(new Date(review.created_at), 'MMM d, yyyy')}
 </span>
 </div>
 {review.content && (
 <p className="text-sm text-muted-foreground mb-3">
 {review.content}
 </p>
 )}
 {/* Product Link */}
 {review.product && (
 <Link 
 to={`/products/${(review.product as any).product_number || review.product.slug}`}
 className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
 >
 {review.product.images?.[0] && (
 <img 
 src={review.product.images[0]} 
 alt={review.product.name}
 className="h-6 w-6 rounded object-cover"
 />
 )}
 <span>Review for: {review.product.name}</span>
 </Link>
 )}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 py-12 text-center">
 <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
 {totalReviews === 0 ? (
 <>
 <h3 className="font-medium mb-1">No Reviews Yet</h3>
 <p className="text-sm text-muted-foreground">
 This store hasn't received any reviews yet.
 </p>
 </>
 ) : (
 <>
 <h3 className="font-medium mb-1">No Results</h3>
 <p className="text-sm text-muted-foreground mb-4">
 No reviews match your filters.
 </p>
 <Button variant="outline" size="sm" onClick={clearFilters}>
 Clear Filters
 </Button>
 </>
 )}
 </div>
 </div>
 )}
 </div>
 </MainLayout>
 );
}
