import { Password } from '@convex-dev/auth/providers/Password'

import type { DataModel } from './_generated/dataModel'

// Password provider with a custom profile function
export default Password<DataModel>({
  profile(params) {
    return {
      email: params.email as string,
      username: params.username as string,
      updatedAt: Date.now(),
      roomId: null,
    }
  },
})
