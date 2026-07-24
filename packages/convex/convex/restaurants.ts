import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { logActivity, requireStaff } from './_helpers'

// Addendum 04 §5.4 — restaurant-level payment configuration. This is display-only: the system
// never transacts against the till, never validates it, and never sends it to any API.

const paymentMethod = v.union(
  v.literal('cash'), v.literal('mpesa'), v.literal('card'), v.literal('other'),
)

// Read by the counter (to render the order summary PDF) and the manager settings screen.
export const settings = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['counter', 'manager'], String(args.restaurantId))
    const restaurant = await ctx.db.get(args.restaurantId)
    if (!restaurant) throw new Error('Restaurant not found')
    return {
      name: restaurant.name,
      acceptedPaymentMethods: (restaurant.acceptedPaymentMethods ?? []) as Array<'cash' | 'mpesa' | 'card' | 'other'>,
      mpesaTillNumber: restaurant.mpesaTillNumber,
    }
  },
})

// §2.4 wording precedent: settlement configuration is a manager-and-above concern. Configured at
// /manager/settings by manager and owner.
export const updateSettings = mutationGeneric({
  args: {
    token: v.string(),
    restaurantId: v.id('restaurants'),
    acceptedPaymentMethods: v.array(paymentMethod),
    mpesaTillNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx.db, args.token, ['manager'], String(args.restaurantId))
    // De-duplicate while preserving the fixed method order; the enum bounds the set already.
    const order: Array<'cash' | 'mpesa' | 'card' | 'other'> = ['cash', 'mpesa', 'card', 'other']
    const methods = order.filter((method) => args.acceptedPaymentMethods.includes(method))
    const till = args.mpesaTillNumber?.trim()
    if (till && !/^\d{3,12}$/u.test(till)) throw new Error('The M-Pesa till number must be 3 to 12 digits')
    // A till only makes sense if M-Pesa is accepted; keep the two coherent.
    const mpesaTillNumber = methods.includes('mpesa') && till ? till : undefined
    await ctx.db.patch(args.restaurantId, { acceptedPaymentMethods: methods, mpesaTillNumber })
    await logActivity(ctx.db, staff, 'settings.payment', `Updated accepted payment methods (${methods.join(', ') || 'none'})`)
    return { acceptedPaymentMethods: methods, mpesaTillNumber }
  },
})
