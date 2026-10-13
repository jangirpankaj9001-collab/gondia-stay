package com.example.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast

object ContactHelper {
    /**
     * Cleans and formats phone numbers for WhatsApp integration (Gondia / India standard).
     * Automatically handles 10-digit Indian mobile numbers by prefixing 91.
     * e.g.:
     * "9823012345" -> "919823012345"
     * "+91 98230 12345" -> "919823012345"
     * "09823012345" -> "919823012345"
     */
    fun formatWhatsAppNumber(rawPhone: String): String {
        val digits = rawPhone.filter { it.isDigit() }
        return when {
            digits.length == 10 -> "91$digits"
            digits.length == 11 && digits.startsWith("0") -> "91${digits.substring(1)}"
            digits.length >= 12 && digits.startsWith("91") -> digits
            else -> digits
        }
    }

    /**
     * Formats phone for crisp and readable UI presentation (e.g. "+91 98230 12345").
     */
    fun formatDisplayPhone(rawPhone: String): String {
        val digits = rawPhone.filter { it.isDigit() }
        return when {
            digits.length == 10 -> "+91 ${digits.substring(0, 5)} ${digits.substring(5)}"
            digits.length == 12 && digits.startsWith("91") -> "+91 ${digits.substring(2, 7)} ${digits.substring(7)}"
            else -> rawPhone
        }
    }

    /**
     * Opens WhatsApp chat with a prefilled message.
     * Tries direct WhatsApp package first, then falls back to wa.me / api.whatsapp.com so it always works.
     */
    fun openWhatsApp(context: Context, rawPhone: String, message: String) {
        val cleanNumber = formatWhatsAppNumber(rawPhone)
        if (cleanNumber.isBlank()) {
            Toast.makeText(context, "Contact number is not available", Toast.LENGTH_SHORT).show()
            return
        }

        val encodedMsg = Uri.encode(message)
        val waUrl = "https://wa.me/$cleanNumber?text=$encodedMsg"

        try {
            // First attempt: open via WhatsApp intent directly
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("whatsapp://send?phone=$cleanNumber&text=$encodedMsg")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            // Fallback: standard browser URL (which also prompts to launch WhatsApp if installed)
            try {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(waUrl)).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(browserIntent)
            } catch (e2: Exception) {
                Toast.makeText(context, "Unable to open WhatsApp: ${e2.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Safely initiates phone dialer.
     */
    fun dialPhone(context: Context, rawPhone: String) {
        try {
            val intent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:$rawPhone")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "Unable to launch dialer: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }
}
