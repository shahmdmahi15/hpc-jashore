package com.shahmdmahi.hpcjashoretv

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.basicMarquee
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
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
import org.json.JSONArray
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

data class TvBulletin(
    val id: String,
    val title: String,
    val contentEn: String,
    val contentBn: String,
    val isUrgent: Boolean = false
)

class MainActivity : ComponentActivity() {

    private lateinit var prefs: SharedPreferences

    @OptIn(ExperimentalTvMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        prefs = getSharedPreferences("hpc_tv_prefs", Context.MODE_PRIVATE)

        // Initialize persistent pairing code
        var pairingCode = prefs.getString("pairing_code", null)
        if (pairingCode == null) {
            pairingCode = "HPC-${(1000..9999).random()}"
            prefs.edit().putString("pairing_code", pairingCode).apply()
        }

        setContent {
            var isDarkTheme by remember { mutableStateOf(prefs.getBoolean("is_dark_theme", true)) }
            var currentLanguage by remember { mutableStateOf(prefs.getString("language", "bn") ?: "bn") }
            var isPaired by remember { mutableStateOf(prefs.getBoolean("is_paired", false)) }
            var deviceName by remember { mutableStateOf(prefs.getString("device_name", "TV Display") ?: "TV Display") }
            var assignedDepartment by remember { mutableStateOf(prefs.getString("assigned_department", "ALL") ?: "ALL") }

            var waitingDoctorList by remember { mutableStateOf<List<ConsultationPatient>>(emptyList()) }
            var waitingTherapyList by remember { mutableStateOf<List<TherapyPatient>>(emptyList()) }
            var liveBulletins by remember { mutableStateOf<List<TvBulletin>>(emptyList()) }
            var currentBulletinIndex by remember { mutableStateOf(0) }

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

            // Periodic Self-Updater Check
            LaunchedEffect(Unit) {
                while (isActive) {
                    try {
                        withContext(Dispatchers.IO) {
                            checkSelfUpdate { hasUpdate, latestVer, apkUrl, forceUpdate ->
                                if ((hasUpdate || forceUpdate) && apkUrl != null) {
                                    updateNotice = "Updating to v$latestVer..."
                                    downloadAndInstallApk(apkUrl)
                                }
                            }
                        }
                    } catch (_: Exception) {}
                    delay(60000) // check every minute
                }
            }

            // Rotate live bulletins every 7 seconds
            LaunchedEffect(liveBulletins) {
                if (liveBulletins.isNotEmpty()) {
                    while (isActive) {
                        delay(7000)
                        currentBulletinIndex = (currentBulletinIndex + 1) % liveBulletins.size
                    }
                }
            }

            // Unpaired flow: register with server and poll status
            LaunchedEffect(pairingCode, isPaired) {
                if (!isPaired) {
                    withContext(Dispatchers.IO) {
                        registerTvWithServer(pairingCode, "0.1.13")
                    }
                    while (!isPaired && isActive) {
                        withContext(Dispatchers.IO) {
                            checkTvPairingStatus(pairingCode) { status, name, dept, token, theme, lang ->
                                if (status == "paired") {
                                    val wantsDark = (theme?.lowercase() != "light")
                                    val resolvedLang = if (lang == "en") "en" else "bn"
                                    prefs.edit()
                                        .putBoolean("is_paired", true)
                                        .putString("device_name", name ?: "TV Display")
                                        .putString("assigned_department", dept ?: "ALL")
                                        .putString("secret_token", token ?: "")
                                        .putBoolean("is_dark_theme", wantsDark)
                                        .putString("language", resolvedLang)
                                        .apply()
                                    launch(Dispatchers.Main) {
                                        deviceName = name ?: "TV Display"
                                        assignedDepartment = dept ?: "ALL"
                                        isDarkTheme = wantsDark
                                        currentLanguage = resolvedLang
                                        isPaired = true
                                    }
                                }
                            }
                        }
                        delay(1500)
                    }
                }
            }

            // Paired flow: Heartbeat check, bulletins & queue snapshot polling
            LaunchedEffect(pairingCode, isPaired) {
                if (isPaired) {
                    var pollCounter = 0
                    while (isPaired && isActive) {
                        // 1. Heartbeat check with instant revocation, department, theme, language, and force-update checks
                        var shouldRevoke = false
                        var newDept: String? = null
                        var newName: String? = null
                        var newTheme: String? = null
                        var newLang: String? = null
                        var shouldForceUpdate = false

                        withContext(Dispatchers.IO) {
                            sendTvHeartbeat(pairingCode, "0.1.13") { isOk, status, dept, name, theme, lang, forceUpdate ->
                                if (!isOk || status == "revoked" || status == "unregistered") {
                                    shouldRevoke = true
                                } else {
                                    if (forceUpdate) {
                                        shouldForceUpdate = true
                                    }
                                    if (!dept.isNullOrBlank() && dept != assignedDepartment) {
                                        newDept = dept
                                    }
                                    if (!name.isNullOrBlank() && name != deviceName) {
                                        newName = name
                                    }
                                    if (!theme.isNullOrBlank()) {
                                        val wantsDark = (theme.lowercase() == "dark")
                                        if (wantsDark != isDarkTheme) {
                                            newTheme = theme.lowercase()
                                        }
                                    }
                                    if (!lang.isNullOrBlank() && (lang == "bn" || lang == "en") && lang != currentLanguage) {
                                        newLang = lang
                                    }
                                }
                            }
                        }

                        if (shouldRevoke) {
                            withContext(Dispatchers.Main) {
                                prefs.edit().putBoolean("is_paired", false).apply()
                                isPaired = false
                            }
                            break
                        }

                        if (shouldForceUpdate) {
                            withContext(Dispatchers.IO) {
                                checkSelfUpdate { hasUpdate, latestVer, apkUrl, _ ->
                                    if (apkUrl != null) {
                                        updateNotice = "Force Updating to v$latestVer..."
                                        downloadAndInstallApk(apkUrl)
                                    }
                                }
                            }
                        }

                        if (newDept != null || newName != null || newTheme != null || newLang != null) {
                            withContext(Dispatchers.Main) {
                                if (newDept != null) {
                                    assignedDepartment = newDept!!
                                    prefs.edit().putString("assigned_department", assignedDepartment).apply()
                                }
                                if (newName != null) {
                                    deviceName = newName!!
                                    prefs.edit().putString("device_name", deviceName).apply()
                                }
                                if (newTheme != null) {
                                    isDarkTheme = (newTheme == "dark")
                                    prefs.edit().putBoolean("is_dark_theme", isDarkTheme).apply()
                                }
                                if (newLang != null) {
                                    currentLanguage = newLang!!
                                    prefs.edit().putString("language", currentLanguage).apply()
                                }
                            }
                        }

                        // 2. Queue Snapshot
                        if (isPaired) {
                            withContext(Dispatchers.IO) {
                                fetchQueueSnapshot { docWait, thWait ->
                                    waitingDoctorList = docWait
                                    waitingTherapyList = thWait
                                }
                            }
                        }

                        // 3. Bulletins (every ~10 seconds)
                        if (isPaired && (pollCounter % 5 == 0)) {
                            withContext(Dispatchers.IO) {
                                fetchTvBulletins { bulletins ->
                                    liveBulletins = bulletins
                                }
                            }
                        }
                        pollCounter++

                        delay(1500)
                    }
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
                    if (!isPaired) {
                        // MANDATORY PAIRING & ACTIVATION SCREEN (Theme/Language remotely administered)
                        TvPairingScreen(
                            pairingCode = pairingCode,
                            currentLanguage = currentLanguage,
                            isDarkTheme = isDarkTheme,
                            currentTime = currentTime
                        )
                    } else {
                        // LIVE 2-COLUMN QUEUE GRID SCREEN
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp)
                        ) {
                            // 1. TOP HEADER (BRANDING, LIVE CLOCK - Remotely Controlled Theme/Language)
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
                                    Image(
                                        painter = painterResource(id = R.drawable.hpc_logo),
                                        contentDescription = "HPC Logo",
                                        modifier = Modifier
                                            .size(42.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                    )
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
                                        fontSize = 15.sp,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Bold
                                    )
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
                                if (assignedDepartment == "ALL" || assignedDepartment == "CONSULTATION") {
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
                                }

                                // ==========================================
                                // COLUMN 2: PHYSIOTHERAPY & REHAB QUEUE
                                // ==========================================
                                if (assignedDepartment == "ALL" || assignedDepartment == "THERAPY") {
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
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // 3. BOTTOM BULLETIN MARQUEE TICKER (FULL-WIDTH TICKER, NO DEVICE INFO)
                            val hasUrgentBulletin = liveBulletins.any { it.isUrgent }

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        if (hasUrgentBulletin) Color(0xFFEF4444).copy(alpha = 0.15f) else surfaceColor
                                    )
                                    .border(
                                        1.dp,
                                        if (hasUrgentBulletin) Color(0xFFEF4444).copy(alpha = 0.5f) else borderColor,
                                        RoundedCornerShape(8.dp)
                                    )
                                    .padding(horizontal = 12.dp, vertical = 7.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (hasUrgentBulletin) Color(0xFFEF4444) else Emerald500)
                                        .padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = if (hasUrgentBulletin) "🚨" else "📢",
                                        fontSize = 11.sp
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = if (hasUrgentBulletin) {
                                            if (currentLanguage == "bn") "জরুরি নোটিশ" else "URGENT BULLETIN"
                                        } else {
                                            if (currentLanguage == "bn") "জরুরি নোটিশ" else "BULLETIN"
                                        },
                                        color = Color.Black,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Box(
                                    modifier = Modifier
                                        .weight(1f),
                                    contentAlignment = Alignment.CenterStart
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .basicMarquee(
                                                iterations = Int.MAX_VALUE,
                                                initialDelayMillis = 1000,
                                                repeatDelayMillis = 0,
                                                velocity = 45.dp
                                            ),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        if (liveBulletins.isNotEmpty()) {
                                            liveBulletins.forEachIndexed { idx, b ->
                                                if (idx > 0) {
                                                    Text(
                                                        text = "      ✦      ",
                                                        color = textMutedColor,
                                                        fontSize = 13.sp,
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                }
                                                if (b.isUrgent) {
                                                    Box(
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(4.dp))
                                                            .background(Color(0xFFEF4444))
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(
                                                            text = if (currentLanguage == "bn") "🚨 জরুরি ঘোষণা" else "🚨 URGENT NOTICE",
                                                            color = Color.White,
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Black
                                                        )
                                                    }
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                } else {
                                                    Text(text = "📢 ", fontSize = 12.sp)
                                                }
                                                Text(
                                                    text = if (currentLanguage == "bn")
                                                        (if (b.contentBn.isNotBlank()) b.contentBn else b.title)
                                                    else
                                                        (if (b.contentEn.isNotBlank()) b.contentEn else b.title),
                                                    color = if (b.isUrgent) Color(0xFFFCA5A5) else Emerald400,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        } else {
                                            Text(
                                                text = if (currentLanguage == "bn")
                                                    "📢 নোটিশ: থেরাপির সময় মোবাইল ফোন সাইলেন্ট রাখুন   ✦   সিরিয়াল অনুযায়ী চেম্বারে প্রবেশ করুন   ✦   যেকোনো তথ্যের জন্য ফ্রন্ট ডেস্কে যোগাযোগ করুন   ✦   হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮"
                                                else
                                                    "📢 Notice: Keep mobile phones silent during therapy   ✦   Enter chamber according to serial token   ✦   Contact front desk for any inquiries   ✦   Hotline: +880 1515-615188",
                                                color = Emerald400,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            }
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

    private fun registerTvWithServer(pairingCode: String, appVersion: String) {
        try {
            val url = URL("https://hpc.toufiquzzaman.com/api/tv/register")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            val body = JSONObject().apply {
                put("pairingCode", pairingCode)
                put("appVersion", appVersion)
                put("deviceName", "Android TV ($pairingCode)")
            }
            conn.outputStream.use { os ->
                os.write(body.toString().toByteArray())
            }
            conn.responseCode
            conn.disconnect()
        } catch (_: Exception) {}
    }

    private fun checkTvPairingStatus(
        pairingCode: String,
        onStatus: (status: String, deviceName: String?, department: String?, secretToken: String?, theme: String?, language: String?) -> Unit
    ) {
        try {
            val url = URL("https://hpc.toufiquzzaman.com/api/tv/status/$pairingCode")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 3000
            conn.readTimeout = 3000
            conn.requestMethod = "GET"

            if (conn.responseCode == 200) {
                val text = conn.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(text)
                val status = json.optString("status", "pending")
                val deviceName = if (json.has("deviceName") && !json.isNull("deviceName")) json.getString("deviceName") else null
                val department = if (json.has("department") && !json.isNull("department")) json.getString("department") else "ALL"
                val secretToken = if (json.has("secretToken") && !json.isNull("secretToken")) json.getString("secretToken") else null
                val theme = if (json.has("theme") && !json.isNull("theme")) json.getString("theme") else "dark"
                val language = if (json.has("language") && !json.isNull("language")) json.getString("language") else "bn"
                onStatus(status, deviceName, department, secretToken, theme, language)
            }
            conn.disconnect()
        } catch (_: Exception) {}
    }

    private fun sendTvHeartbeat(
        pairingCode: String,
        appVersion: String,
        onStatus: (Boolean, String, String?, String?, String?, String?, Boolean) -> Unit
    ) {
        try {
            val url = URL("https://hpc.toufiquzzaman.com/api/tv/heartbeat")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 3000
            conn.readTimeout = 3000
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            val body = JSONObject().apply {
                put("pairingCode", pairingCode)
                put("appVersion", appVersion)
            }
            conn.outputStream.use { os ->
                os.write(body.toString().toByteArray())
            }
            if (conn.responseCode in 200..299) {
                val text = conn.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(text)
                val status = json.optString("status", "")
                val paired = json.optBoolean("paired", status == "paired")
                val dept = if (json.has("department") && !json.isNull("department")) json.getString("department") else null
                val name = if (json.has("deviceName") && !json.isNull("deviceName")) json.getString("deviceName") else null
                val theme = if (json.has("theme") && !json.isNull("theme")) json.getString("theme") else null
                val lang = if (json.has("language") && !json.isNull("language")) json.getString("language") else null
                val forceUpdate = json.optBoolean("forceUpdate", false)
                if (!paired || status == "revoked" || status == "unregistered") {
                    onStatus(false, "revoked", null, null, null, null, false)
                } else {
                    onStatus(true, "paired", dept, name, theme, lang, forceUpdate)
                }
            } else if (conn.responseCode in 400..499) {
                onStatus(false, "revoked", null, null, null, null, false)
            }
            conn.disconnect()
        } catch (_: Exception) {}
    }

    private fun fetchTvBulletins(onResult: (List<TvBulletin>) -> Unit) {
        try {
            val url = URL("https://hpc.toufiquzzaman.com/api/tv/bulletins")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            conn.requestMethod = "GET"

            if (conn.responseCode == 200) {
                val text = conn.inputStream.bufferedReader().use { it.readText() }
                val arr = JSONArray(text)
                val list = mutableListOf<TvBulletin>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    list.add(
                        TvBulletin(
                            id = obj.optString("id", ""),
                            title = obj.optString("title", ""),
                            contentEn = obj.optString("contentEn", ""),
                            contentBn = obj.optString("contentBn", ""),
                            isUrgent = obj.optInt("isUrgent", 0) == 1
                        )
                    )
                }
                onResult(list)
            }
            conn.disconnect()
        } catch (_: Exception) {}
    }

    private fun fetchQueueSnapshot(
        onResult: (List<ConsultationPatient>, List<TherapyPatient>) -> Unit
    ) {
        try {
            val url = URL("https://hpc.toufiquzzaman.com/api/visits/tv/snapshot")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            conn.requestMethod = "GET"

            if (conn.responseCode == 200) {
                val text = conn.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(text)

                val consultationObj = json.optJSONObject("consultationQueue")
                val docArr = consultationObj?.optJSONArray("waiting") ?: JSONArray()
                val docList = mutableListOf<ConsultationPatient>()
                for (i in 0 until docArr.length()) {
                    val obj = docArr.getJSONObject(i)
                    docList.add(
                        ConsultationPatient(
                            serialNumber = obj.optInt("serialNumber", i + 1),
                            tokenNumber = obj.optInt("tokenNumber", i + 1),
                            patientNameEn = obj.optString("patientNameEn", "Patient"),
                            patientNameBn = if (obj.has("patientNameBn") && !obj.isNull("patientNameBn")) obj.getString("patientNameBn") else null,
                            doctorName = obj.optString("doctorNameEn", "Dr. Toufiq Uz Zaman"),
                            chamber = "Chamber 1",
                            priority = obj.optString("priority", "regular")
                        )
                    )
                }

                val therapyObj = json.optJSONObject("therapyQueue")
                val thArr = therapyObj?.optJSONArray("waiting") ?: JSONArray()
                val thList = mutableListOf<TherapyPatient>()
                for (i in 0 until thArr.length()) {
                    val obj = thArr.getJSONObject(i)
                    thList.add(
                        TherapyPatient(
                            tokenNumber = obj.optInt("tokenNumber", i + 1),
                            patientNameEn = obj.optString("patientNameEn", "Patient"),
                            patientNameBn = if (obj.has("patientNameBn") && !obj.isNull("patientNameBn")) obj.getString("patientNameBn") else null,
                            bedName = "Bed ${i + 1}",
                            modality = "Physiotherapy",
                            durationMinutes = 20,
                            priority = obj.optString("priority", "regular")
                        )
                    )
                }
                onResult(docList, thList)
            }
            conn.disconnect()
        } catch (_: Exception) {}
    }

    private fun checkSelfUpdate(onResult: (Boolean, String, String?, Boolean) -> Unit) {
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
                val forceUpdate = json.optBoolean("forceUpdate", false)
                val latestVersion = json.optString("latestVersion", "1.0.0")
                val apkUrl = json.optString("apkUrl", null)
                onResult(updateAvailable, latestVersion, apkUrl, forceUpdate)
            }
            conn.disconnect()
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

@Composable
fun TvPairingScreen(
    pairingCode: String,
    currentLanguage: String,
    isDarkTheme: Boolean,
    currentTime: String
) {
    val bgColor = if (isDarkTheme) DarkBackground else LightBackground
    val surfaceColor = if (isDarkTheme) DarkSurface else LightSurface
    val borderColor = if (isDarkTheme) DarkBorder else LightBorder
    val textColor = if (isDarkTheme) DarkText else LightText
    val textMutedColor = if (isDarkTheme) DarkTextMuted else LightTextMuted

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // 1. Header (Branding + Clock)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(surfaceColor)
                .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                .padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(
                    painter = painterResource(id = R.drawable.hpc_logo),
                    contentDescription = "HPC Logo",
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(8.dp))
                )
                Spacer(modifier = Modifier.width(14.dp))
                Column {
                    Text(
                        text = if (currentLanguage == "bn") "হেলথ অ্যান্ড পেইন কেয়ার সেন্টার · যশোর" else "Health & Pain Care Center · Jashore",
                        color = textColor,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (currentLanguage == "bn") "স্মার্ট লাইভ সিরিয়াল ডিসপ্লে" else "Smart Live Serial Display Queue",
                        color = textMutedColor,
                        fontSize = 13.sp
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = currentTime,
                    color = Emerald400,
                    fontSize = 15.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // 2. Central Activation Card
        Column(
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .clip(RoundedCornerShape(16.dp))
                .background(surfaceColor)
                .border(2.dp, Emerald500.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Image(
                painter = painterResource(id = R.drawable.hpc_logo),
                contentDescription = "HPC Logo",
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(12.dp))
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Badge
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color(0xFFEAB308).copy(alpha = 0.18f))
                    .border(1.dp, Color(0xFFEAB308).copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                    .padding(horizontal = 16.dp, vertical = 6.dp)
            ) {
                Text(
                    text = if (currentLanguage == "bn") "⚡ ডিসপ্লে অ্যাক্টিভেশন প্রয়োজন • DISPLAY ACTIVATION REQUIRED" else "⚡ DISPLAY ACTIVATION REQUIRED • ডিসপ্লে অ্যাক্টিভেশন প্রয়োজন",
                    color = Color(0xFFFACC15),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = if (currentLanguage == "bn") "টিভি পেয়ারিং কোড" else "TV PAIRING CODE",
                color = textMutedColor,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Code container
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(bgColor)
                    .border(2.dp, Emerald500, RoundedCornerShape(12.dp))
                    .padding(horizontal = 36.dp, vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = pairingCode,
                    color = Emerald400,
                    fontSize = 46.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 4.sp
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Instructions
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(bgColor.copy(alpha = 0.6f))
                    .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Bengali instructions
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "সহজ সংযোগ পদ্ধতি:",
                        color = Emerald400,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "১. অ্যাডমিন প্যানেলে যান: https://hpc.toufiquzzaman.com/admin\n" +
                               "২. 'Users & Device Management' ট্যাবে যান\n" +
                               "৩. 'Pair New TV' ক্লিক করে এই কোডটি দিন: $pairingCode\n" +
                               "৪. অনুমোদন দিলে সাথে সাথে ডিসপ্লে চালু হয়ে যাবে।",
                        color = textColor,
                        fontSize = 12.sp,
                        lineHeight = 18.sp
                    )
                }

                // English instructions
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Quick Setup Instructions:",
                        color = Emerald400,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "1. Open Admin Panel: https://hpc.toufiquzzaman.com/admin\n" +
                               "2. Go to 'Users & Device Management' -> 'TV Devices'\n" +
                               "3. Click 'Pair New TV' and enter code: $pairingCode\n" +
                               "4. Screen will activate automatically upon approval.",
                        color = textColor,
                        fontSize = 12.sp,
                        lineHeight = 18.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(Emerald400)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (currentLanguage == "bn")
                        "অ্যাডমিন অনুমোদনের অপেক্ষা করা হচ্ছে... (স্বয়ংক্রিয় রিফ্রেশ সক্রিয়)"
                    else
                        "Waiting for admin pairing approval... (Auto-refresh active)",
                    color = textMutedColor,
                    fontSize = 12.sp,
                    fontStyle = FontStyle.Italic
                )
            }
        }

        // 3. Footer
        Text(
            text = "Health & Pain Care Center · Jashore • Hardware Station ID: $pairingCode • Version 0.1.13",
            color = textMutedColor,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace
        )
    }
}
