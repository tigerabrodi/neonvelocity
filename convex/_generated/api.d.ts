/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as constants from "../constants.js";
import type * as errors from "../errors.js";
import type * as games_errors from "../games/errors.js";
import type * as games_mutations from "../games/mutations.js";
import type * as games_queries from "../games/queries.js";
import type * as http from "../http.js";
import type * as passwordProvider from "../passwordProvider.js";
import type * as playerProgress_mutations from "../playerProgress/mutations.js";
import type * as playerProgress_queries from "../playerProgress/queries.js";
import type * as playerProgress_utils from "../playerProgress/utils.js";
import type * as rooms_errors from "../rooms/errors.js";
import type * as rooms_mutations from "../rooms/mutations.js";
import type * as rooms_queries from "../rooms/queries.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  constants: typeof constants;
  errors: typeof errors;
  "games/errors": typeof games_errors;
  "games/mutations": typeof games_mutations;
  "games/queries": typeof games_queries;
  http: typeof http;
  passwordProvider: typeof passwordProvider;
  "playerProgress/mutations": typeof playerProgress_mutations;
  "playerProgress/queries": typeof playerProgress_queries;
  "playerProgress/utils": typeof playerProgress_utils;
  "rooms/errors": typeof rooms_errors;
  "rooms/mutations": typeof rooms_mutations;
  "rooms/queries": typeof rooms_queries;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
