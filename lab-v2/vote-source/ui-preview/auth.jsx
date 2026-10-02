export const useCurrentUserState = () => ({
  user: { id: "preview-host", displayName: "示例发起人", isDevFallback: true },
  isPending: false,
});
export const useCurrentUser = () => useCurrentUserState().user;
export const signOut = async () => {};
export const RedirectToSignIn = () => null;
