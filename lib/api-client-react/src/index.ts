export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  customFetch,
  setBaseUrl,
  setAuthTokenGetter,
  setOnUnauthorized,
  setRefreshTokenGetter,
  setOnTokenRefreshed,
} from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
export {
  createApiFetcher,
  RefreshError,
  FetchTimeoutError,
} from "./createApiFetcher";
export type {
  CreateApiFetcherConfig,
  CoreFetch,
  CoreFetchOpts,
  RefreshResult,
} from "./createApiFetcher";
export {
  createCircuitBreaker,
  CircuitOpenError,
} from "./circuitBreaker";
export type {
  CircuitBreakerConfig,
  ApiCircuitBreaker,
} from "./circuitBreaker";
export {
  createResilientFetcher,
} from "./resilience";
export type {
  ResilientFetcherConfig,
  ResilientFetcher,
} from "./resilience";
export { rateRide, getDispatchStatus, retryRideDispatch } from "./ride-dispatch";
export {
  getBanners, getTrending, getForYou, getSimilar,
  trackInteraction, getProductVariants,
  getFlashDeals, getTrendingSearches, searchProducts,
  getWishlist, addToWishlist, removeFromWishlist, checkWishlist,
  getProductReviews, getProductReviewSummary, submitProductReview,
  uploadImage, getHierarchicalCategories,
} from "./discovery";
export type {
  Banner, RecommendationProduct, FlashDealProduct,
  SearchProductsParams, SearchProductsResponse,
  WishlistItem, ProductReview, ProductReviewsResponse, ReviewSummary,
  HierarchicalCategory,
} from "./discovery";
