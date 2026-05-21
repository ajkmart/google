// Generated API types & hooks — run `pnpm orval` to regenerate from the OpenAPI spec.
// If this file is absent after a fresh clone, run `node scripts/ensure-generated-stub.mjs`
// from the lib/api-client-react directory to create an empty stub, then re-run orval.
export * from "./generated/api";
export * from "./generated/api.schemas";
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
  customFetch,
  setBaseUrl,
  setAuthTokenGetter,
  setOnUnauthorized,
  setRefreshTokenGetter,
  setOnTokenRefreshed,
  setOnApiError,
  setMaxRetryAttempts,
  setRetryBackoffBaseMs,
} from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
export {
  createResilientFetcher,
} from "./resilience";
export type {
  ResilientFetcherConfig,
  ResilientFetcher,
} from "./resilience";
export { queryClient } from "./queryClient";
export {
  rateRide,
  getDispatchStatus,
  retryRideDispatch,
} from "./ride-dispatch";
export {
  getBanners,
  getTrending,
  getForYou,
  getSimilar,
  trackInteraction,
  getProductVariants,
  getFlashDeals,
  getTrendingSearches,
  searchProducts,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  getProductReviews,
  getProductReviewSummary,
  checkCanReviewProduct,
  submitProductReview,
  uploadImage,
  getHierarchicalCategories,
  subscribeStockNotify,
  unsubscribeStockNotify,
  checkStockNotifySubscription,
} from "./discovery";
export type {
  Banner,
  RecommendationProduct,
  FlashDealProduct,
  SearchProductsParams,
  SearchProductsResponse,
  WishlistItem,
  ProductReview,
  ProductReviewsResponse,
  ReviewSummary,
  HierarchicalCategory,
} from "./discovery";
