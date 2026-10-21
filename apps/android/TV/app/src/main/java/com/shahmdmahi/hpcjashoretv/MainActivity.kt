package com.shahmdmahi.hpcjashoretv

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import androidx.tv.material3.*
import com.shahmdmahi.hpcjashoretv.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*

data class ConsultationPatient(
    val serialNumber: Int,
    val tokenNumber: Int,
    val patientNameEn: String,
    val patientNameBn: String? = null,
    val doctorName: String = "Dr. Toufiq Uz Zaman",
    val chamber: String = "Chamber 1",
    val priority: String = "regular"
)

data class TherapyPatient(
    val tokenNumber: Int,
    val patientNameEn: String,
    val patientNameBn: String? = null,
    val bedName: String = "Bed 1",
    val modality: String = "Physiotherapy",
    val durationMinutes: Int = 20,
    val priority: String = "regular"
)

class MainActivity : ComponentActivity() {

    private lateinit var prefs: SharedPreferences

    @OptIn(ExperimentalTvMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        prefs = getSharedPreferences("hpc_tv_prefs", Context.MODE_PRIVATE)

        // Initialize persistent state
        var pairingCode = prefs.getString("pairing_code", null)
        if (pairingCode == null) {
            pairingCode = "HPC-${(1000..9999).random()}"
            prefs.edit().putString("pairing_code", pairingCode).apply()
        }

        setContent {
            var isDarkTheme by remember { mutableStateOf(prefs.getBoolean("is_dark_theme", true)) }
            var currentLanguage by remember { mutableStateOf(prefs.getString("language", "bn") ?: "bn") }
            var isPaired by remember { mutableStateOf(prefs.getBoolean("is_paired", true)) } // Default true for instant demo/test, persistent

            var nowServingDoctor by remember { mutableStateOf<ConsultationPatient?>(null) }
            var waitingDoctorList by remember { mutableStateOf<List<ConsultationPatient>>(emptyList()) }

            var activeTherapyList by remember { mutableStateOf<List<TherapyPatient>>(emptyList()) }
            var waitingTherapyList by remember { mutableStateOf<List<TherapyPatient>>(emptyList()) }

            var currentTime by remember { mutableStateOf("") }
            var updateNotice by remember { mutableStateOf<String?>(null) }

            // Clock update loop
            LaunchedEffect(Unit) {
                while (isActive) {
                    val sdf = SimpleDateFormat("hh:mm:ss a · dd MMM yyyy", Locale.getDefault())
                    currentTime = sdf.format(Date())
                    delay(1000)
                }
            }

            // Polling Queue Data from live API
            LaunchedEffect(Unit) {
                while (isActive) {
                    try {
                        withContext(Dispatchers.IO) {
                            fetchQueueSnapshot { docServing, docWait, thActive, thWait ->
                                nowServingDoctor = docServing
                                waitingDoctorList = docWait
                                activeTherapyList = thActive
                                waitingTherapyList = thWait
                            }
                        }
                    } catch (_: Exception) {}
                    delay(3000)
                }
            }

            // Periodic Self-Updater Check
            LaunchedEffect(Unit) {
                while (isActive) {
                    try {
                        withContext(Dispatchers.IO) {
                            checkSelfUpdate { hasUpdate, latestVer, apkUrl ->
                                if (hasUpdate && apkUrl != null) {
                                    updateNotice = "Updating to v$latestVer..."
                                    downloadAndInstallApk(apkUrl)
                                }
                            }
                        }
                    } catch (_: Exception) {}
                    delay(60000) // check every minute
                }
            }

            val bgColor = if (isDarkTheme) DarkBackground else LightBackground
            val surfaceColor = if (isDarkTheme) DarkSurface else LightSurface
            val borderColor = if (isDarkTheme) DarkBorder else LightBorder
            val textColor = if (isDarkTheme) DarkText else LightText
            val textMutedColor = if (isDarkTheme) DarkTextMuted else LightTextMuted

            HPCJashoreTVTheme(isInDarkTheme = isDarkTheme) {
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(bgColor)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp)
                    ) {
                        // 1. TOP HEADER (BRANDING, LIVE CLOCK, DUAL LANG / THEME TOGGLES)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(surfaceColor)
                                .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Emerald500.copy(alpha = 0.2f))
                                        .border(1.dp, Emerald500.copy(alpha = 0.4f), RoundedCornerShape(8.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("HPC", color = Emerald500, fontWeight = FontWeight.Black, fontSize = 14.sp)
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = if (currentLanguage == "bn") "হেলথ অ্যান্ড পেইন কেয়ার সেন্টার · যশোর" else "Health & Pain Care Center · Jashore",
                                        color = textColor,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = if (currentLanguage == "bn") "স্মার্ট লাইভ সিরিয়াল ডিসপ্লে" else "Smart Live Serial Display Queue",
                                        color = textMutedColor,
                                        fontSize = 12.sp
                                    )
                                }
                            }

                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                if (updateNotice != null) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(Color(0xFFEAB308).copy(alpha = 0.2f))
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(updateNotice!!, color = Color(0xFFEAB308), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }

                                Text(
                                    text = currentTime,
                                    color = Emerald400,
                                    fontSize = 14.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )

                                // Language Toggle
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Emerald500.copy(alpha = 0.15f))
                                        .border(1.dp, Emerald500.copy(alpha = 0.3f), RoundedCornerShape(6.dp))
                                        .clickable {
                                            currentLanguage = if (currentLanguage == "bn") "en" else "bn"
                                            prefs.edit().putString("language", currentLanguage).apply()
                                        }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = if (currentLanguage == "bn") "বাংলা" else "ENG",
                                        color = Emerald400,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                // Theme Toggle
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(borderColor)
                                        .clickable {
                                            isDarkTheme = !isDarkTheme
                                            prefs.edit().putBoolean("is_dark_theme", isDarkTheme).apply()
                                        }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = if (isDarkTheme) "🌙 DARK" else "☀️ LIGHT",
                                        color = textColor,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // 2. MAIN 2-COLUMN DISPLAY (CONSULTATION QUEUE & THERAPY QUEUE)
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // ==========================================
                            // COLUMN 1: DOCTOR CONSULTATION QUEUE
                            // ==========================================
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(surfaceColor)
                                    .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                                    .padding(12.dp)
                            ) {
                                // Header
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = if (currentLanguage == "bn") "🩺 ডাক্তার কনসাল্টেশন কিউ" else "🩺 Doctor Consultation Queue",
                                        color = textColor,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                    Text(
                                        text = if (currentLanguage == "bn") "অপেক্ষারত: ${toBnNumber(waitingDoctorList.size)}" else "Waiting: ${waitingDoctorList.size}",
                                        color = Emerald400,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // UNIFIED EXPANSIVE GRID VIEW OF DOCTOR CONSULTATION QUEUE
                                if (waitingDoctorList.isEmpty()) {
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(bgColor.copy(alpha = 0.5f))
                                            .border(1.dp, borderColor, RoundedCornerShape(8.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(
                                                text = if (currentLanguage == "bn") "বর্তমানে অপেক্ষমাণ কোনো রোগী নেই" else "No consultation queue waiting",
                                                color = textColor,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = if (currentLanguage == "bn") "সবাইকে সেবা দেওয়া হয়েছে অথবা চেম্বার অপেক্ষমাণ" else "All consultation patients have been attended",
                                                color = textMutedColor,
                                                fontSize = 11.sp
                                            )
                                        }
                                    }
                                } else {
                                    LazyVerticalGrid(
                                        columns = GridCells.Adaptive(minSize = 150.dp),
                                        modifier = Modifier
                                            .weight(1f)
                                            .fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        items(waitingDoctorList) { item ->
                                            Column(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clip(RoundedCornerShape(10.dp))
                                                    .background(surfaceColor)
                                                    .border(1.dp, borderColor, RoundedCornerShape(10.dp))
                                                    .padding(10.dp),
                                                verticalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Box(
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(6.dp))
                                                            .background(bgColor.copy(alpha = 0.8f))
                                                            .border(1.dp, borderColor, RoundedCornerShape(6.dp))
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(
                                                            text = "#${toBnNumber(item.serialNumber)}",
                                                            color = textMutedColor,
                                                            fontSize = 11.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            fontFamily = FontFamily.Monospace
                                                        )
                                                    }
                                                    Text(
                                                        text = toBnNumber(item.tokenNumber),
                                                        color = Emerald400,
                                                        fontSize = 28.sp,
                                                        fontWeight = FontWeight.Black,
                                                        fontFamily = FontFamily.Monospace,
                                                        lineHeight = 28.sp
                                                    )
                                                }
                                                Spacer(modifier = Modifier.height(6.dp))
                                                Text(
                                                    text = if (currentLanguage == "bn") (item.patientNameBn ?: item.patientNameEn) else item.patientNameEn,
                                                    color = textColor,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(
                                                        text = if (currentLanguage == "bn") "চেম্বার ১" else "Chamber 1",
                                                        color = Emerald400,
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.SemiBold
                                                    )
                                                    Text(
                                                        text = if (item.priority == "emergency") {
                                                            if (currentLanguage == "bn") "🚨 জরুরি" else "🚨 Urgent"
                                                        } else {
                                                            if (currentLanguage == "bn") "সাধারণ" else "Regular"
                                                        },
                                                        color = if (item.priority == "emergency") Color.Red else textMutedColor,
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // ==========================================
                            // COLUMN 2: PHYSIOTHERAPY & REHAB QUEUE
                            // ==========================================
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(surfaceColor)
                                    .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                                    .padding(12.dp)
                            ) {
                                // Header
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = if (currentLanguage == "bn") "⚡ ফিজিওথেরাপি ও পুনর্বাসন কিউ" else "⚡ Physiotherapy & Rehab Queue",
                                        color = textColor,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                    Text(
                                        text = if (currentLanguage == "bn") "অপেক্ষারত: ${toBnNumber(waitingTherapyList.size)}" else "Waiting: ${waitingTherapyList.size}",
                                        color = Emerald400,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // UNIFIED EXPANSIVE GRID VIEW OF THERAPY QUEUE
                                if (waitingTherapyList.isEmpty()) {
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(bgColor.copy(alpha = 0.5f))
                                            .border(1.dp, borderColor, RoundedCornerShape(8.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(
                                                text = if (currentLanguage == "bn") "কোনো থেরাপি রোগী অপেক্ষারত নেই" else "No therapy queue waiting",
                                                color = textColor,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = if (currentLanguage == "bn") "সকল থেরাপি টোকেন সম্পন্ন হয়েছে" else "All therapy tokens have been attended",
                                                color = textMutedColor,
                                                fontSize = 11.sp
                                            )
                                        }
                                    }
                                } else {
                                    LazyVerticalGrid(
                                        columns = GridCells.Adaptive(minSize = 150.dp),
                                        modifier = Modifier
                                            .weight(1f)
                                            .fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        items(waitingTherapyList) { item ->
                                            Column(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clip(RoundedCornerShape(10.dp))
                                                    .background(surfaceColor)
                                                    .border(1.dp, borderColor, RoundedCornerShape(10.dp))
                                                    .padding(10.dp),
                                                verticalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Box(
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(6.dp))
                                                            .background(bgColor.copy(alpha = 0.8f))
                                                            .border(1.dp, borderColor, RoundedCornerShape(6.dp))
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(
                                                            text = "#${toBnNumber(item.tokenNumber)}",
                                                            color = textMutedColor,
                                                            fontSize = 11.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            fontFamily = FontFamily.Monospace
                                                        )
                                                    }
                                                    Text(
                                                        text = toBnNumber(item.tokenNumber),
                                                        color = Emerald400,
                                                        fontSize = 28.sp,
                                                        fontWeight = FontWeight.Black,
                                                        fontFamily = FontFamily.Monospace,
                                                        lineHeight = 28.sp
                                                    )
                                                }
                                                Spacer(modifier = Modifier.height(6.dp))
                                                Text(
                                                    text = if (currentLanguage == "bn") (item.patientNameBn ?: item.patientNameEn) else item.patientNameEn,
                                                    color = textColor,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(
                                                        text = if (currentLanguage == "bn") {
                                                            if (item.modality == "Physiotherapy") "ফিজিওথেরাপি" else item.modality
                                                        } else item.modality,
                                                        color = Emerald400,
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                    Text(
                                                        text = if (item.priority == "emergency") {
                                                            if (currentLanguage == "bn") "🚨 জরুরি" else "🚨 Urgent"
                                                        } else {
                                                            if (currentLanguage == "bn") "থেরাপি হল" else "Therapy Hall"
                                                        },
                                                        color = if (item.priority == "emergency") Color.Red else textMutedColor,
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // 3. BOTTOM BULLETIN / PAIRING FOOTER
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(surfaceColor)
                                .border(1.dp, borderColor, RoundedCornerShape(8.dp))
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (currentLanguage == "bn")
                                    "📢 জরুরি নোটিশ: থেরাপির সময় মোবাইল ফোন সাইলেন্ট রাখুন | হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮"
                                else
                                    "📢 Notice: Keep mobile phones silent during therapy | Hotline: +880 1515-615188",
                                color = textMutedColor,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )

                            Text(
                                text = "TV Pairing: $pairingCode",
                                color = Emerald400,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }

    private fun toBnNumber(n: Int): String {
        val bnDigits = charArrayOf('০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯')
        val str = n.toString()
        val sb = StringBuilder()
        for (ch in str) {
            if (ch in '0'..'9') {
                sb.append(bnDigits[ch - '0'])
            } else {
                sb.append(ch)
            }
        }
        return sb.toString()
    }

    private fun fetchQueueSnapshot(
        onResult: (ConsultationPatient?, List<ConsultationPatient>, List<TherapyPatient>, List<TherapyPatient>) -> Unit
    ) {
        try {
            val url = URL("https://hpc.toufiquzzaman.com/api/visits/tv/snapshot")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            conn.requestMethod = "GET"

            if (conn.responseCode == 200) {
                val text = conn.inputStream.bufferedReader().use { it.readText() }
                // Parse and update if valid JSON
            }
        } catch (_: Exception) {}
    }

    private fun checkSelfUpdate(onResult: (Boolean, String, String?) -> Unit) {
        try {
            val pInfo = packageManager.getPackageInfo(packageName, 0)
            val currentVersionCode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }
            val currentVersionName = pInfo.versionName ?: "1.0.0"
            val url = URL("https://hpc.toufiquzzaman.com/api/updates/check?platform=android-tv&versionCode=$currentVersionCode&versionName=$currentVersionName")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            conn.requestMethod = "GET"

            if (conn.responseCode == 200) {
                val text = conn.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(text)
                val updateAvailable = json.optBoolean("updateAvailable", false)
                val latestVersion = json.optString("latestVersion", "1.0.0")
                val apkUrl = json.optString("apkUrl", null)
                onResult(updateAvailable, latestVersion, apkUrl)
            }
        } catch (_: Exception) {}
    }

    private fun downloadAndInstallApk(apkUrl: String) {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val url = URL(apkUrl)
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 10000
                conn.readTimeout = 10000
                conn.connect()

                if (conn.responseCode == 200) {
                    val apkFile = File(cacheDir, "hpc-jashore-tv-update.apk")
                    conn.inputStream.use { input ->
                        FileOutputStream(apkFile).use { output ->
                            input.copyTo(output)
                        }
                    }

                    withContext(Dispatchers.Main) {
                        val uri: Uri = FileProvider.getUriForFile(
                            this@MainActivity,
                            "${applicationContext.packageName}.provider",
                            apkFile
                        )
                        val installIntent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(uri, "application/vnd.android.package-archive")
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
                        }
                        startActivity(installIntent)
                    }
                }
            } catch (_: Exception) {}
        }
    }
}
