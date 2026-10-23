import type { Locale } from "./types";

type Pair = [ar: string, en: string];
const L = (l: Locale, p: Pair | undefined, fallback = "") => (p ? (l === "ar" ? p[0] : p[1]) : fallback);

export const ORDER_STATUS: Record<string, Pair> = {
  PENDING_CONFIRMATION: ["بانتظار التأكيد", "Pending confirmation"],
  CONFIRMED: ["مؤكد", "Confirmed"],
  PREPARING: ["قيد التجهيز", "Preparing"],
  SHIPPED: ["تم الشحن", "Shipped"],
  OUT_FOR_DELIVERY: ["خرج للتوصيل", "Out for delivery"],
  DELIVERED: ["تم التوصيل", "Delivered"],
  CANCELED: ["ملغي", "Canceled"],
  RETURNED: ["مُرتجع", "Returned"],
};

export const PAYMENT_STATUS: Record<string, Pair> = {
  UNPAID: ["غير مدفوع", "Unpaid"],
  PENDING: ["بانتظار الدفع", "Pending"],
  PAID: ["مدفوع", "Paid"],
  FAILED: ["فشل الدفع", "Failed"],
  REFUNDED: ["مُسترد", "Refunded"],
  PARTIALLY_REFUNDED: ["مُسترد جزئياً", "Partially refunded"],
};

export const PAYMENT_METHOD: Record<string, Pair> = {
  COD: ["الدفع عند الاستلام", "Cash on delivery"],
  CARD: ["بطاقة فيزا / ماستركارد", "Visa / Mastercard"],
};

export const AVAILABILITY: Record<string, Pair> = {
  IN_STOCK: ["متوفر", "In stock"],
  OUT_OF_STOCK: ["نفد المخزون", "Out of stock"],
  PREORDER: ["طلب مسبق", "Pre-order"],
  UNVERIFIED: ["التوفر يُؤكَّد بعد الطلب", "Availability confirmed after ordering"],
};

export const COMMISSION_STATUS: Record<string, Pair> = {
  PENDING: ["معلّقة", "Pending"],
  APPROVED: ["مستحقة", "Earned"],
  PAID: ["مدفوعة", "Paid"],
  VOID: ["ملغاة", "Void"],
};

export const ERRORS: Record<string, Pair> = {
  REQUIRED: ["هذا الحقل مطلوب", "This field is required"],
  TOO_SHORT: ["القيمة قصيرة جداً", "Too short"],
  INVALID_PHONE: ["رقم الجوال غير صحيح (مثال: 0599123456)", "Invalid mobile number (e.g. 0599123456)"],
  INVALID_EMAIL: ["البريد الإلكتروني غير صحيح", "Invalid email address"],
  PASSWORD_SHORT: ["كلمة المرور 8 أحرف على الأقل", "Password must be at least 8 characters"],
  EMPTY_CART: ["سلتك فارغة", "Your cart is empty"],
  CART_CHANGED: ["تغيّرت بعض تفاصيل سلتك. راجعيها قبل المتابعة.", "Some items in your cart changed. Please review before continuing."],
  UNAVAILABLE_ITEMS: ["بعض المنتجات لم تعد متوفرة", "Some items are no longer available"],
  OUT_OF_STOCK: ["الكمية المطلوبة غير متوفرة", "The requested quantity is not available"],
  ITEM_NOT_FOUND: ["أحد المنتجات لم يعد موجوداً", "An item no longer exists"],
  NOT_SERVICEABLE: ["التوصيل غير متاح حالياً لهذه المنطقة", "Delivery is not currently available to this area"],
  LOCALITY_NOT_FOUND: ["اختاري مدينة أو بلدة من القائمة", "Choose a city or village from the list"],
  COUPON_INVALID: ["كود الخصم غير صالح", "This coupon is not valid"],
  COD_NOT_AVAILABLE: ["الدفع عند الاستلام غير متاح حالياً", "Cash on delivery is currently unavailable"],
  COD_NOT_AVAILABLE_AREA: ["الدفع عند الاستلام غير متاح لهذه المنطقة", "Cash on delivery isn't available in this area"],
  CARD_NOT_AVAILABLE: ["الدفع بالبطاقة غير مفعّل بعد", "Card payment is not yet enabled"],
  RATE_LIMITED: ["محاولات كثيرة. حاولي بعد قليل.", "Too many attempts. Please try again shortly."],
  INVALID_CREDENTIALS: ["البريد أو كلمة المرور غير صحيحة", "Incorrect email or password"],
  EMAIL_TAKEN: ["هذا البريد مسجّل مسبقاً", "This email is already registered"],
  SERVER: ["حدث خطأ غير متوقع. حاولي مرة أخرى.", "Something went wrong. Please try again."],
  NOT_FOUND: ["غير موجود", "Not found"],
  NOT_STARTED: ["العرض لم يبدأ بعد", "This offer hasn't started yet"],
  EXPIRED: ["انتهت صلاحية الكود", "This code has expired"],
  INACTIVE: ["الكود غير فعّال", "This code is inactive"],
  USAGE_LIMIT: ["تم استخدام الكود بالحد الأقصى", "This code has reached its usage limit"],
  CUSTOMER_LIMIT: ["استخدمتِ هذا الكود من قبل", "You've already used this code"],
  MIN_ORDER: ["لم تصلي للحد الأدنى للطلب", "Minimum order amount not reached"],
  NO_ELIGIBLE_ITEMS: ["لا توجد منتجات مشمولة بهذا الكود", "No items in your cart qualify for this code"],
  INVALID_TRANSITION: ["لا يمكن الانتقال لهذه الحالة", "That status change is not allowed"],
  CARD_NOT_PAID: ["لا يمكن تأكيد طلب بطاقة قبل تأكيد الدفع من البوابة", "Card orders can't be confirmed before the gateway confirms payment"],
  FORBIDDEN: ["لا تملك صلاحية لهذا الإجراء", "You don't have permission for this action"],
  UNAUTHORIZED: ["يرجى تسجيل الدخول", "Please sign in"],
  NOT_COD: ["هذا الطلب ليس دفعاً عند الاستلام", "This is not a cash-on-delivery order"],
  ALREADY_RECORDED: ["تم تسجيل الدفع مسبقاً", "Payment already recorded"],
  INVALID_STATE: ["لا يمكن تنفيذ الإجراء في حالة الطلب الحالية", "Not possible in the order's current state"],
  NOTHING_TO_REFUND: ["لا يوجد دفع مُستلم لاسترداده", "There is no collected payment to refund"],
  INVALID_AMOUNT: ["المبلغ غير صحيح", "Invalid amount"],
  PROVIDER_NOT_CONFIGURED: ["بوابة الدفع غير مُعدّة", "Payment gateway is not configured"],
};

export const statusLabel = (l: Locale, s: string) => L(l, ORDER_STATUS[s], s);
export const paymentStatusLabel = (l: Locale, s: string) => L(l, PAYMENT_STATUS[s], s);
export const paymentMethodLabel = (l: Locale, s: string) => L(l, PAYMENT_METHOD[s], s);
export const availabilityLabel = (l: Locale, s: string) => L(l, AVAILABILITY[s], s);
export const commissionStatusLabel = (l: Locale, s: string) => L(l, COMMISSION_STATUS[s], s);
export const errorLabel = (l: Locale, code: string) => L(l, ERRORS[code], L(l, ERRORS.SERVER));
