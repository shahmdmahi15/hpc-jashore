package com.shahmdmahi.hpcjashoretv

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.ToneGenerator
import android.net.Uri
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.net.URLEncoder
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
    val doctorName: String = "",
    val chamber: String = "Chamber 1",
    val priority: String = "regular",
    val isTherapy: Boolean = false
)

data class TherapyPatient(
    val tokenNumber: Int,
    val patientNameEn: String,
    val patientNameBn: String? = null,
    val bedName: String = "Therapy Hall",
    val roomName: String = "Therapy Hall",
    val modality: String = "Physiotherapy",
    val durationMinutes: Int = 20,
    val priority: String = "regular",
    val toldTime: String? = null,
    val punctualityStatus: String? = null,
    val delayMinutes: Int? = null
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
    private var textToSpeech: TextToSpeech? = null
    private var toneGenerator: ToneGenerator? = null
    private var mediaPlayer: MediaPlayer? = null
    private var isTtsInitialized = false

    @OptIn(ExperimentalTvMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        prefs = getSharedPreferences("hpc_tv_prefs", Context.MODE_PRIVATE)

        try {
            toneGenerator = ToneGenerator(AudioManager.STREAM_MUSIC, 100)
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()

            val initListener = TextToSpeech.OnInitListener { status ->
                if (status == TextToSpeech.SUCCESS) {
                    isTtsInitialized = true
                    try {
                        textToSpeech?.setAudioAttributes(audioAttributes)
                        textToSpeech?.setSpeechRate(0.9f)
                        textToSpeech?.setPitch(1.0f)
                    } catch (_: Exception) {}
                }
            }

            try {
                textToSpeech = TextToSpeech(this, initListener, "com.google.android.tts")
            } catch (_: Exception) {
                textToSpeech = TextToSpeech(this, initListener)
            }
        } catch (_: Exception) {}

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
            var activeCallAlert by remember { mutableStateOf<ConsultationPatient?>(null) }
            var callCountdown by remember { mutableStateOf(16) }
            var lastCallKey by remember { mutableStateOf<String?>(null) }
            var liveBulletins by remember { mutableStateOf<List<TvBulletin>>(emptyList()) }
            var currentBulletinIndex by remember { mutableStateOf(0) }

            var currentTime by remember { mutableStateOf("") }
            var updateNotice by remember { mutableStateOf<String?>(null) }

            val triggerCallAlert: (ConsultationPatient) -> Unit = { patient ->
                activeCallAlert = patient
                callCountdown = 16
                speakChamberCall(patient)
            }

            // Auto dismiss countdown ticker for calling alert (mimics Web /tv 16s timeout)
            LaunchedEffect(activeCallAlert) {
                if (activeCallAlert != null) {
                    callCountdown = 16
                    while (isActive && callCountdown > 0) {
                        delay(1000)
                        callCountdown -= 1
                    }
                    if (callCountdown <= 0) {
                        activeCallAlert = null
                    }
                }
            }

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
                                    downloadAndInstallApk(apkUrl) {
                                        updateNotice = null
                                    }
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

            // -----------------------------------------------------------------
            // Pure Real-Time Streaming & Live Queue Synchronization
            // -----------------------------------------------------------------

            // Registration on boot
            LaunchedEffect(pairingCode) {
                withContext(Dispatchers.IO) {
                    registerTvWithServer(pairingCode, BuildConfig.VERSION_NAME)
                }
            }

            // Real-Time Persistent SSE Event Stream (for instant pairing, queue & call updates)
            LaunchedEffect(pairingCode) {
                while (isActive) {
                    withContext(Dispatchers.IO) {
                        streamTvRealtimeEvents(pairingCode) { type, payload ->
                            if (type == "tv:restart" || type == "tv.restart" || payload.optString("action") == "restart") {
                                restartApp()
                                return@streamTvRealtimeEvents
                            }
                            if (type == "tv:paired") {
                                val wantsDark = (payload.optString("theme", "dark").lowercase() != "light")
                                val resolvedLang = if (payload.optString("language", "bn") == "en") "en" else "bn"
                                val name = payload.optString("deviceName", "TV Display")
                                val dept = payload.optString("department", "ALL")
                                val token = payload.optString("secretToken", "")
                                prefs.edit()
                                    .putBoolean("is_paired", true)
                                    .putString("device_name", name)
                                    .putString("assigned_department", dept)
                                    .putString("secret_token", token)
                                    .putBoolean("is_dark_theme", wantsDark)
                                    .putString("language", resolvedLang)
                                    .apply()
                                deviceName = name
                                assignedDepartment = dept
                                isDarkTheme = wantsDark
                                currentLanguage = resolvedLang
                                isPaired = true

                                // Fetch initial queue & bulletins upon pairing
                                fetchQueueSnapshot { docWait, thWait, calledPat ->
                                    waitingDoctorList = docWait
                                    waitingTherapyList = thWait
                                    if (calledPat != null) {
                                        val key = "${calledPat.isTherapy}_${calledPat.tokenNumber}_${calledPat.chamber}"
                                        if (key != lastCallKey) {
                                            lastCallKey = key
                                            triggerCallAlert(calledPat)
                                        }
                                    }
                                }
                                fetchTvBulletins { bulletins ->
                                    liveBulletins = bulletins
                                }
                            } else if (type == "tv:revoked" || type == "tv:deleted") {
                                prefs.edit().putBoolean("is_paired", false).apply()
                                isPaired = false
                            } else if (type == "tv:updated") {
                                if (payload.optString("action") == "restart") {
                                    restartApp()
                                    return@streamTvRealtimeEvents
                                }
                                val newName = payload.optString("deviceName", "")
                                val newDept = payload.optString("department", "")
                                val newTheme = payload.optString("theme", "")
                                val newLang = payload.optString("language", "")
                                if (newName.isNotEmpty() && newName != deviceName) {
                                    deviceName = newName
                                    prefs.edit().putString("device_name", deviceName).apply()
                                }
                                if (newDept.isNotEmpty() && newDept != assignedDepartment) {
                                    assignedDepartment = newDept
                                    prefs.edit().putString("assigned_department", assignedDepartment).apply()
                                }
                                if (newTheme.isNotEmpty()) {
                                    val wantsDark = (newTheme.lowercase() != "light")
                                    if (wantsDark != isDarkTheme) {
                                        isDarkTheme = wantsDark
                                        prefs.edit().putBoolean("is_dark_theme", isDarkTheme).apply()
                                    }
                                }
                                if (newLang.isNotEmpty()) {
                                    val resolved = if (newLang == "en") "en" else "bn"
                                    if (resolved != currentLanguage) {
                                        currentLanguage = resolved
                                        prefs.edit().putString("language", currentLanguage).apply()
                                    }
                                }
                            } else if (type == "consultation.call_chamber") {
                                val serial = payload.optInt("serialNumber", 1)
                                val token = payload.optInt("tokenNumber", serial)
                                val patNameEn = payload.optString("patientNameEn", "Patient")
                                val patNameBn = if (payload.has("patientNameBn") && !payload.isNull("patientNameBn")) payload.getString("patientNameBn") else null
                                val docName = payload.optString("doctorNameEn", "Doctor")
                                val chamberNum = payload.optString("chamberRoomNumber", "")
                                val chamberName = payload.optString("chamberName", "")
                                val chamberStr = if (chamberNum.isNotBlank()) "Room $chamberNum" else if (chamberName.isNotBlank()) chamberName else "Chamber 1"
                                val calledPat = ConsultationPatient(
                                    serialNumber = serial,
                                    tokenNumber = if (token > 0) token else 1,
                                    patientNameEn = patNameEn,
                                    patientNameBn = patNameBn,
                                    doctorName = docName,
                                    chamber = chamberStr,
                                    isTherapy = false
                                )
                                lastCallKey = "consult_${serial}_${token}_${System.currentTimeMillis()}"
                                triggerCallAlert(calledPat)
                                if (isPaired) {
                                    fetchQueueSnapshot { docWait, thWait, _ ->
                                        waitingDoctorList = docWait
                                        waitingTherapyList = thWait
                                    }
                                }
                            } else if (type == "therapy.called") {
                                val token = payload.optInt("tokenNumber", 1)
                                val patNameEn = payload.optString("patientNameEn", "Patient")
                                val patNameBn = if (payload.has("patientNameBn") && !payload.isNull("patientNameBn")) payload.getString("patientNameBn") else null
                                val roomName = payload.optString("roomName", "")
                                val roomNum = payload.optString("roomNumber", "1")
                                val chamberStr = if (roomName.isNotBlank()) {
                                    if (Regex("\\d").containsMatchIn(roomName)) roomName else "$roomName $roomNum"
                                } else {
                                    "Therapy Room $roomNum"
                                }
                                val calledPat = ConsultationPatient(
                                    serialNumber = if (token > 0) token else 1,
                                    tokenNumber = if (token > 0) token else 1,
                                    patientNameEn = patNameEn,
                                    patientNameBn = patNameBn,
                                    doctorName = "",
                                    chamber = chamberStr,
                                    isTherapy = true
                                )
                                lastCallKey = "therapy_${token}_${System.currentTimeMillis()}"
                                triggerCallAlert(calledPat)
                                if (isPaired) {
                                    fetchQueueSnapshot { docWait, thWait, _ ->
                                        waitingDoctorList = docWait
                                        waitingTherapyList = thWait
                                    }
                                }
                            } else if (type == "consultation.in_chamber" || type == "consultation.call_cancelled" ||
                                       type == "therapy.in_session" || type == "therapy.call_cancelled") {
                                activeCallAlert = null
                                try { textToSpeech?.stop() } catch (_: Exception) {}
                                if (isPaired) {
                                    fetchQueueSnapshot { docWait, thWait, _ ->
                                        waitingDoctorList = docWait
                                        waitingTherapyList = thWait
                                    }
                                }
                            } else if (type.startsWith("queue.") || type.startsWith("visit.") ||
                                       type.startsWith("consultation.") || type.startsWith("therapy.") ||
                                       type.startsWith("serial.") || type.startsWith("call.")) {
                                if (isPaired) {
                                    fetchQueueSnapshot { docWait, thWait, calledPat ->
                                        waitingDoctorList = docWait
                                        waitingTherapyList = thWait
                                        if (calledPat != null) {
                                            val key = "${calledPat.isTherapy}_${calledPat.tokenNumber}_${calledPat.chamber}"
                                            if (key != lastCallKey) {
                                                lastCallKey = key
                                                triggerCallAlert(calledPat)
                                            }
                                        } else {
                                            if (activeCallAlert != null) {
                                                activeCallAlert = null
                                                try { textToSpeech?.stop() } catch (_: Exception) {}
                                            }
                                        }
                                    }
                                }
                            } else if (type.startsWith("bulletin.")) {
                                if (isPaired) {
                                    fetchTvBulletins { bulletins ->
                                        liveBulletins = bulletins
                                    }
                                }
                            }
                        }
                    }
                    delay(2000)
                }
            }

            // Initial Snapshot Fetch Upon Paired Activation
            LaunchedEffect(isPaired) {
                if (isPaired) {
                    fetchQueueSnapshot { docWait, thWait, calledPat ->
                        waitingDoctorList = docWait
                        waitingTherapyList = thWait
                        if (calledPat != null) {
                            val key = "${calledPat.isTherapy}_${calledPat.tokenNumber}_${calledPat.chamber}"
                            if (key != lastCallKey) {
                                lastCallKey = key
                                triggerCallAlert(calledPat)
                            }
                        }
                    }
                    fetchTvBulletins { bulletins ->
                        liveBulletins = bulletins
                    }
                }
            }

            // Continuous 2.5-second Real-time Polling Loop (mimics Web /tv setInterval(loadData, 3000) for instant state parity)
            LaunchedEffect(isPaired) {
                if (isPaired) {
                    while (isActive && isPaired) {
                        fetchQueueSnapshot { docWait, thWait, calledPat ->
                            waitingDoctorList = docWait
                            waitingTherapyList = thWait
                            if (calledPat != null) {
                                val key = "${calledPat.isTherapy}_${calledPat.tokenNumber}_${calledPat.chamber}"
                                if (key != lastCallKey) {
                                    lastCallKey = key
                                    triggerCallAlert(calledPat)
                                }
                            } else {
                                if (activeCallAlert != null) {
                                    activeCallAlert = null
                                    try { textToSpeech?.stop() } catch (_: Exception) {}
                                }
                            }
                        }
                        delay(2500)
                    }
                }
            }

            // Bulletins auto-refresh loop (every 20s)
            LaunchedEffect(isPaired) {
                if (isPaired) {
                    while (isActive && isPaired) {
                        fetchTvBulletins { bulletins ->
                            liveBulletins = bulletins
                        }
                        delay(20000)
                    }
                }
            }

            // Dedicated Robust Heartbeat Loop (every 8 seconds with remote restart check)
            LaunchedEffect(pairingCode, isPaired) {
                if (isPaired) {
                    while (isPaired && isActive) {
                        withContext(Dispatchers.IO) {
                            sendTvHeartbeat(pairingCode, BuildConfig.VERSION_NAME) { isOk, status, dept, name, theme, lang, forceUpdate ->
                                if (!isOk || status == "revoked" || status == "unregistered") {
                                    launch(Dispatchers.Main) {
                                        prefs.edit().putBoolean("is_paired", false).apply()
                                        isPaired = false
                                    }
                                } else {
                                    if (forceUpdate) {
                                        checkSelfUpdate { hasUpdate, latestVer, apkUrl, _ ->
                                            if (apkUrl != null) {
                                                launch(Dispatchers.Main) {
                                                    updateNotice = "Force Updating to v$latestVer..."
                                                }
                                                downloadAndInstallApk(apkUrl) {
                                                    updateNotice = null
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        delay(8000)
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
                        Box(modifier = Modifier.fillMaxSize()) {
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
                                                            val chamberDigits = item.chamber.replace(Regex("[^0-9]"), "").ifBlank { "1" }
                                                            val chamberDisplay = if (currentLanguage == "bn") "চেম্বার $chamberDigits" else "Chamber $chamberDigits"
                                                            Text(
                                                                text = chamberDisplay,
                                                                color = Emerald400,
                                                                fontSize = 10.sp,
                                                                fontWeight = FontWeight.SemiBold
                                                            )
                                                            Text(
                                                                text = if (currentLanguage == "bn") "সিরিয়াল #${toBnNumber(item.serialNumber)}" else "Serial #${item.serialNumber}",
                                                                color = textMutedColor,
                                                                fontSize = 11.sp,
                                                                fontWeight = FontWeight.Medium
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
                                                            val roomDigits = item.roomName.replace(Regex("[^0-9]"), "").ifBlank { "1" }
                                                            val roomDisplay = if (currentLanguage == "bn") "থেরাপি রুম $roomDigits" else "Room $roomDigits"
                                                            Text(
                                                                text = roomDisplay,
                                                                color = textMutedColor,
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
                                                    "📢 নোটিশ: থেরাপির সময় মোবাইল ফোন সাইলেন্ট রাখুন   ✦   সিরিয়াল অনুযায়ী চেম্বারে প্রবেশ করুন   ✦   যেকোনো তথ্যের জন্য রিসেপশনে যোগাযোগ করুন   ✦   হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮"
                                                else
                                                    "📢 Notice: Keep mobile phones silent during therapy   ✦   Enter chamber according to serial token   ✦   Contact reception for any inquiries   ✦   Hotline: +880 1515-615188",
                                                color = Emerald400,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Fullscreen Calling Alert Notification Overlay
                        activeCallAlert?.let { patient ->
                            CallingAlertOverlay(
                                patient = patient,
                                callCountdown = callCountdown,
                                currentLanguage = currentLanguage,
                                isDarkTheme = isDarkTheme,
                                onDismiss = { activeCallAlert = null }
                            )
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

    private fun streamTvRealtimeEvents(
        pairingCode: String,
        onEvent: (type: String, payload: JSONObject) -> Unit
    ) {
        var conn: HttpURLConnection? = null
        try {
            val url = URL("https://hpc.toufiquzzaman.com/api/sse/feed?pairingCode=$pairingCode")
            conn = url.openConnection() as HttpURLConnection
            conn.setRequestProperty("Accept", "text/event-stream")
            conn.setRequestProperty("Cache-Control", "no-cache")
            conn.connectTimeout = 10000
            conn.readTimeout = 60000
            conn.doInput = true
            conn.connect()

            if (conn.responseCode == 200) {
                val reader = conn.inputStream.bufferedReader()
                var currentEvent = "message"
                val dataBuffer = StringBuilder()

                while (true) {
                    val line = reader.readLine() ?: break
                    if (line.startsWith("event:")) {
                        currentEvent = line.substring(6).trim()
                    } else if (line.startsWith("data:")) {
                        val d = line.substring(5).trim()
                        if (dataBuffer.isNotEmpty()) dataBuffer.append("\n")
                        dataBuffer.append(d)
                    } else if (line.isEmpty()) {
                        if (dataBuffer.isNotEmpty()) {
                            val rawData = dataBuffer.toString()
                            dataBuffer.setLength(0)
                            try {
                                val json = JSONObject(rawData)
                                val type = json.optString("type", currentEvent)
                                val payload = json.optJSONObject("payload") ?: json
                                android.os.Handler(android.os.Looper.getMainLooper()).post {
                                    onEvent(type, payload)
                                }
                            } catch (_: Exception) {}
                        }
                        currentEvent = "message"
                    }
                }
            }
        } catch (_: Exception) {
            // Stream disconnected or error
        } finally {
            try { conn?.disconnect() } catch (_: Exception) {}
        }
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

    private fun restartApp() {
        runOnUiThread {
            try {
                val intent = packageManager.getLaunchIntentForPackage(packageName)
                val restartIntent = Intent.makeRestartActivityTask(intent?.component)
                startActivity(restartIntent)
                Runtime.getRuntime().exit(0)
            } catch (_: Exception) {
                try {
                    val intent = Intent(this, MainActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    }
                    startActivity(intent)
                    Runtime.getRuntime().exit(0)
                } catch (_: Exception) {}
            }
        }
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
                val restartRequested = json.optBoolean("restartRequested", false) || json.optString("command") == "restart"

                if (restartRequested) {
                    restartApp()
                    return
                }

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
        lifecycleScope.launch(Dispatchers.IO) {
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
                    withContext(Dispatchers.Main) {
                        onResult(list)
                    }
                }
                conn.disconnect()
            } catch (_: Exception) {}
        }
    }

    private fun fetchQueueSnapshot(
        onResult: (List<ConsultationPatient>, List<TherapyPatient>, ConsultationPatient?) -> Unit
    ) {
        lifecycleScope.launch(Dispatchers.IO) {
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
                        val chamberNum = if (obj.has("chamberRoomNumber") && !obj.isNull("chamberRoomNumber")) obj.optString("chamberRoomNumber") else ""
                        val chamberName = if (obj.has("chamberName") && !obj.isNull("chamberName")) obj.optString("chamberName") else ""
                        val chamberStr = if (chamberNum.isNotBlank()) "Room $chamberNum" else if (chamberName.isNotBlank()) chamberName else "Chamber 1"
                        docList.add(
                            ConsultationPatient(
                                serialNumber = obj.optInt("serialNumber", i + 1),
                                tokenNumber = obj.optInt("tokenNumber", i + 1),
                                patientNameEn = obj.optString("patientNameEn", "Patient"),
                                patientNameBn = if (obj.has("patientNameBn") && !obj.isNull("patientNameBn")) obj.getString("patientNameBn") else null,
                                doctorName = obj.optString("doctorNameEn", ""),
                                chamber = chamberStr,
                                priority = obj.optString("priority", "regular")
                            )
                        )
                    }

                    // Check active called patient in nowServing
                    val nowServingArr = consultationObj?.optJSONArray("nowServing")
                    var calledPatient: ConsultationPatient? = null
                    if (nowServingArr != null && nowServingArr.length() > 0) {
                        val obj = nowServingArr.getJSONObject(0)
                        val chamberNum = if (obj.has("chamberRoomNumber") && !obj.isNull("chamberRoomNumber")) obj.optString("chamberRoomNumber") else ""
                        val chamberName = if (obj.has("chamberName") && !obj.isNull("chamberName")) obj.optString("chamberName") else ""
                        val chamberStr = if (chamberNum.isNotBlank()) "Room $chamberNum" else if (chamberName.isNotBlank()) chamberName else "Chamber 1"
                        val ser = obj.optInt("serialNumber", 1)
                        val tok = obj.optInt("tokenNumber", ser)
                        calledPatient = ConsultationPatient(
                            serialNumber = if (ser > 0) ser else 1,
                            tokenNumber = if (tok > 0) tok else 1,
                            patientNameEn = obj.optString("patientNameEn", "Patient"),
                            patientNameBn = if (obj.has("patientNameBn") && !obj.isNull("patientNameBn")) obj.getString("patientNameBn") else null,
                            doctorName = obj.optString("doctorNameEn", "Doctor"),
                            chamber = chamberStr,
                            priority = obj.optString("priority", "regular"),
                            isTherapy = false
                        )
                    }

                    val therapyObj = json.optJSONObject("therapyQueue")

                    // Check active called patient in therapy nowServing if no consultation called
                    if (calledPatient == null) {
                        val thNowServing = therapyObj?.optJSONArray("nowServing")
                        if (thNowServing != null && thNowServing.length() > 0) {
                            for (i in 0 until thNowServing.length()) {
                                val obj = thNowServing.getJSONObject(i)
                                if (obj.optString("status") == "calling") {
                                    val roomNum = if (obj.has("roomNumber") && !obj.isNull("roomNumber")) obj.optString("roomNumber") else "1"
                                    val rawRoom = if (obj.has("roomName") && !obj.isNull("roomName")) obj.getString("roomName") else "Therapy Room $roomNum"
                                    val roomStr = if (Regex("\\d").containsMatchIn(rawRoom)) rawRoom else "$rawRoom $roomNum"
                                    val tok = obj.optInt("tokenNumber", 1)
                                    val resolvedTok = if (tok > 0) tok else 1
                                    calledPatient = ConsultationPatient(
                                        serialNumber = resolvedTok,
                                        tokenNumber = resolvedTok,
                                        patientNameEn = obj.optString("patientNameEn", "Patient"),
                                        patientNameBn = if (obj.has("patientNameBn") && !obj.isNull("patientNameBn")) obj.getString("patientNameBn") else null,
                                        doctorName = "",
                                        chamber = roomStr,
                                        priority = obj.optString("priority", "regular"),
                                        isTherapy = true
                                    )
                                    break
                                }
                            }
                        }
                    }
                    val thArr = therapyObj?.optJSONArray("waiting") ?: JSONArray()
                    val thList = mutableListOf<TherapyPatient>()
                    for (i in 0 until thArr.length()) {
                        val obj = thArr.getJSONObject(i)
                        val roomNum = if (obj.has("roomNumber") && !obj.isNull("roomNumber")) obj.optString("roomNumber") else "1"
                        val rawRoom = if (obj.has("roomName") && !obj.isNull("roomName")) obj.getString("roomName") else "Therapy Room $roomNum"
                        val roomStr = if (Regex("\\d").containsMatchIn(rawRoom)) rawRoom else "$rawRoom $roomNum"
                        val tok = obj.optInt("tokenNumber", i + 1)
                        thList.add(
                            TherapyPatient(
                                tokenNumber = if (tok > 0) tok else (i + 1),
                                patientNameEn = obj.optString("patientNameEn", "Patient"),
                                patientNameBn = if (obj.has("patientNameBn") && !obj.isNull("patientNameBn")) obj.getString("patientNameBn") else null,
                                roomName = roomStr,
                                modality = obj.optString("modalityNameBn", obj.optString("modalityNameEn", "Physiotherapy")),
                                durationMinutes = 20,
                                priority = obj.optString("priority", "regular"),
                                toldTime = if (obj.has("toldTime") && !obj.isNull("toldTime")) obj.getString("toldTime") else null,
                                punctualityStatus = if (obj.has("punctualityStatus") && !obj.isNull("punctualityStatus")) obj.getString("punctualityStatus") else null,
                                delayMinutes = if (obj.has("delayMinutes") && !obj.isNull("delayMinutes")) obj.getInt("delayMinutes") else null
                            )
                        )
                    }
                    withContext(Dispatchers.Main) {
                        onResult(docList, thList, calledPatient)
                    }
                }
                conn.disconnect()
            } catch (_: Exception) {}
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            textToSpeech?.stop()
            textToSpeech?.shutdown()
            toneGenerator?.release()
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
        } catch (_: Exception) {}
    }

    private fun playOnlineTts(
        text: String,
        lang: String,
        onFinished: () -> Unit,
        onFailure: () -> Unit
    ) {
        if (text.isBlank()) {
            onFinished()
            return
        }
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val encoded = URLEncoder.encode(text, "UTF-8")
                val streamUrl = "https://translate.google.com/translate_tts?ie=UTF-8&tl=$lang&client=tw-ob&q=$encoded"

                withContext(Dispatchers.Main) {
                    try {
                        mediaPlayer?.stop()
                        mediaPlayer?.release()
                        mediaPlayer = MediaPlayer().apply {
                            setAudioAttributes(
                                AudioAttributes.Builder()
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                    .setUsage(AudioAttributes.USAGE_MEDIA)
                                    .build()
                            )
                            val headers = mapOf("User-Agent" to "Mozilla/5.0 (Linux; Android)")
                            setDataSource(this@MainActivity, Uri.parse(streamUrl), headers)
                            setOnPreparedListener { mp ->
                                try {
                                    mp.start()
                                } catch (_: Exception) {
                                    onFailure()
                                }
                            }
                            setOnCompletionListener { mp ->
                                try {
                                    mp.release()
                                } catch (_: Exception) {}
                                mediaPlayer = null
                                onFinished()
                            }
                            setOnErrorListener { mp, _, _ ->
                                try {
                                    mp.release()
                                } catch (_: Exception) {}
                                mediaPlayer = null
                                onFailure()
                                true
                            }
                            prepareAsync()
                        }
                    } catch (_: Exception) {
                        onFailure()
                    }
                }
            } catch (_: Exception) {
                withContext(Dispatchers.Main) {
                    onFailure()
                }
            }
        }
    }

    private fun speakWithLocalTts(banglaText: String, englishText: String) {
        val tts = textToSpeech ?: return
        try {
            tts.stop()

            // Multi-level fallback for English on Android TV
            val enCandidates = listOf(
                Locale("en", "IN"),
                Locale("en", "GB"),
                Locale.US,
                Locale.ENGLISH,
                Locale.getDefault()
            )
            var resolvedEnLocale = Locale.US
            for (loc in enCandidates) {
                val res = tts.isLanguageAvailable(loc)
                if (res != TextToSpeech.LANG_MISSING_DATA && res != TextToSpeech.LANG_NOT_SUPPORTED) {
                    resolvedEnLocale = loc
                    break
                }
            }

            // Check if local Bangla voice data is installed
            val bnCandidates = listOf(
                Locale("bn", "BD"),
                Locale("bn", "IN"),
                Locale("bn")
            )
            var resolvedBnLocale: Locale? = null
            for (loc in bnCandidates) {
                val res = tts.isLanguageAvailable(loc)
                if (res != TextToSpeech.LANG_MISSING_DATA && res != TextToSpeech.LANG_NOT_SUPPORTED) {
                    resolvedBnLocale = loc
                    break
                }
            }

            val speakParams = Bundle().apply {
                putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC)
                putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
            }

            if (resolvedBnLocale != null && banglaText.isNotBlank()) {
                tts.language = resolvedBnLocale
                tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) {
                        if (utteranceId == "bn_call" && englishText.isNotBlank()) {
                            try {
                                Thread.sleep(350)
                                tts.language = resolvedEnLocale
                                tts.speak(englishText, TextToSpeech.QUEUE_FLUSH, speakParams, "en_call")
                            } catch (_: Exception) {}
                        }
                    }
                    override fun onError(utteranceId: String?) {
                        if (englishText.isNotBlank()) {
                            try {
                                tts.language = resolvedEnLocale
                                tts.speak(englishText, TextToSpeech.QUEUE_FLUSH, speakParams, "en_call")
                            } catch (_: Exception) {}
                        }
                    }
                })
                tts.speak(banglaText, TextToSpeech.QUEUE_FLUSH, speakParams, "bn_call")
            } else if (englishText.isNotBlank()) {
                tts.language = resolvedEnLocale
                tts.speak(englishText, TextToSpeech.QUEUE_FLUSH, speakParams, "en_call")
            }
        } catch (_: Exception) {}
    }

    private fun speakChamberCall(patient: ConsultationPatient) {
        try {
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP2, 500)
        } catch (_: Exception) {}

        val doctorName = patient.doctorName.ifBlank { "Doctor" }
        val patientNameBn = patient.patientNameBn ?: patient.patientNameEn
        val patientNameEn = patient.patientNameEn
        val chamber = patient.chamber

        val banglaText: String
        val englishText: String

        val bnDigits = charArrayOf('০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯')
        val toBnDigits: (String) -> String = { raw ->
            val sb = StringBuilder()
            for (ch in raw) {
                if (ch in '0'..'9') sb.append(bnDigits[ch - '0']) else sb.append(ch)
            }
            sb.toString()
        }

        if (patient.isTherapy) {
            val roomDigits = chamber.replace(Regex("[^0-9]"), "").ifBlank { "1" }
            val roomDigitsBn = toBnDigits(roomDigits)
            val roomNameBn = "থেরাপি রুম $roomDigitsBn"
            val roomNameEn = "Therapy Room $roomDigits"
            banglaText = "থেরাপির জন্য রোগী $patientNameBn কে $roomNameBn এ আসার জন্য অনুরোধ করা হচ্ছে।"
            englishText = "Patient $patientNameEn, please proceed to $roomNameEn for therapy."
        } else {
            val chamberDigits = chamber.replace(Regex("[^0-9]"), "").ifBlank { "1" }
            val chamberDigitsBn = toBnDigits(chamberDigits)
            banglaText = "ডাঃ $doctorName, রোগী $patientNameBn কে $chamberDigitsBn নম্বর রুমে ডাকছেন"
            englishText = "Doctor $doctorName is calling patient $patientNameEn to room number $chamberDigits"
        }

        // Play voice announcement after bell chime:
        // Priority 1: High-fidelity natural online TTS streaming (crystal-clear native Bangla & English audio on Android TV)
        // Priority 2: Offline fallback to local Android TextToSpeech engine
        lifecycleScope.launch {
            delay(650)
            playOnlineTts(
                text = banglaText,
                lang = "bn",
                onFinished = {
                    lifecycleScope.launch {
                        delay(350)
                        playOnlineTts(
                            text = englishText,
                            lang = "en",
                            onFinished = {},
                            onFailure = {
                                speakWithLocalTts("", englishText)
                            }
                        )
                    }
                },
                onFailure = {
                    speakWithLocalTts(banglaText, englishText)
                }
            )
        }
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

    private fun downloadAndInstallApk(apkUrl: String, onFinished: (() -> Unit)? = null) {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                var currentUrl = apkUrl
                var connection: HttpURLConnection? = null
                var redirectCount = 0

                // Manually follow HTTP redirects (GitHub releases redirect to AWS S3/Azure Blob CDN)
                while (redirectCount < 5) {
                    val url = URL(currentUrl)
                    connection = url.openConnection() as HttpURLConnection
                    connection.instanceFollowRedirects = true
                    connection.connectTimeout = 15000
                    connection.readTimeout = 15000
                    connection.connect()

                    val code = connection.responseCode
                    if (code in 300..399) {
                        val newLocation = connection.getHeaderField("Location")
                        if (newLocation != null) {
                            currentUrl = newLocation
                            redirectCount++
                            connection.disconnect()
                            continue
                        }
                    }
                    break
                }

                if (connection != null && connection.responseCode == 200) {
                    val apkFile = File(cacheDir, "hpc-jashore-tv-update.apk")
                    connection.inputStream.use { input ->
                        FileOutputStream(apkFile).use { output ->
                            input.copyTo(output)
                        }
                    }

                    withContext(Dispatchers.Main) {
                        onFinished?.invoke()
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
                } else {
                    withContext(Dispatchers.Main) {
                        onFinished?.invoke()
                    }
                }
            } catch (_: Exception) {
                withContext(Dispatchers.Main) {
                    onFinished?.invoke()
                }
            }
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
            text = "Health & Pain Care Center · Jashore • Hardware Station ID: $pairingCode • Version ${BuildConfig.VERSION_NAME}",
            color = textMutedColor,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace
        )
    }
}

@Composable
fun CallingAlertOverlay(
    patient: ConsultationPatient,
    callCountdown: Int,
    currentLanguage: String,
    isDarkTheme: Boolean,
    onDismiss: () -> Unit
) {
    val isBn = currentLanguage == "bn"
    val cardBg = if (isDarkTheme) Color(0xF5090D0B) else Color(0xF9FFFFFF)
    val textPrimary = if (isDarkTheme) Color.White else Color(0xFF0F172A)
    val textSecondary = if (isDarkTheme) Color(0xFF94A3B8) else Color(0xFF475569)
    val bnDigits = charArrayOf('০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯')

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.88f))
            .clickable { onDismiss() },
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .widthIn(min = 520.dp, max = 820.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(cardBg)
                .border(4.dp, Emerald500, RoundedCornerShape(28.dp))
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Pulse Badge
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(30.dp))
                    .background(Emerald500.copy(alpha = 0.15f))
                    .border(1.dp, Emerald500.copy(alpha = 0.5f), RoundedCornerShape(30.dp))
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(Emerald400)
                )
                Text(
                    text = if (isBn) "রোগীকে ডাকা হচ্ছে • NOW CALLING" else "NOW CALLING PATIENT",
                    color = Emerald400,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp
                )
            }

            // Token Number (always at least 1, never 0)
            val tokNum = if (patient.tokenNumber > 0) patient.tokenNumber else 1
            val tokenStr = tokNum.toString().let { raw ->
                if (isBn) {
                    val sb = StringBuilder()
                    for (ch in raw) {
                        if (ch in '0'..'9') sb.append(bnDigits[ch - '0']) else sb.append(ch)
                    }
                    sb.toString()
                } else raw
            }

            Text(
                text = if (isBn) "টোকেন #$tokenStr" else "TOKEN #$tokNum",
                color = Emerald400,
                fontSize = 38.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Black
            )

            // Patient Name
            Text(
                text = if (isBn) patient.patientNameBn ?: patient.patientNameEn else patient.patientNameEn,
                color = textPrimary,
                fontSize = 44.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
                lineHeight = 50.sp
            )

            // Doctor & Chamber Box (prominently featuring the room number)
            val roomDigits = patient.chamber.replace(Regex("[^0-9]"), "").ifBlank { "1" }
            val roomDigitsBn = roomDigits.let { raw ->
                val sb = StringBuilder()
                for (ch in raw) {
                    if (ch in '0'..'9') sb.append(bnDigits[ch - '0']) else sb.append(ch)
                }
                sb.toString()
            }
            val chamberDisplayText = if (patient.isTherapy) {
                if (isBn) "থেরাপি রুম $roomDigitsBn" else "THERAPY ROOM $roomDigits"
            } else {
                if (isBn) "রুম নম্বর $roomDigitsBn" else "ROOM $roomDigits"
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(Emerald600)
                    .padding(horizontal = 24.dp, vertical = 18.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (patient.isTherapy) {
                            if (isBn) "ফিজিওথেরাপি ও পুনর্বাসন" else "PHYSIOTHERAPY & REHAB"
                        } else {
                            if (patient.doctorName.isNotBlank()) "ডাঃ ${patient.doctorName}" else (if (isBn) "ডাক্তার কনসাল্টেশন চেম্বার" else "DOCTOR CONSULTATION CHAMBER")
                        },
                        color = Color(0xFFD1FAE5),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = chamberDisplayText,
                        color = Color.White,
                        fontSize = 34.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace
                    )
                    if (patient.chamber.isNotBlank() && !patient.chamber.equals(chamberDisplayText, ignoreCase = true)) {
                        Text(
                            text = patient.chamber,
                            color = Color(0xFFD1FAE5),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Auto dismiss countdown & Dismiss button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val countdownBn = callCountdown.toString().let { raw ->
                    val sb = StringBuilder()
                    for (ch in raw) {
                        if (ch in '0'..'9') sb.append(bnDigits[ch - '0']) else sb.append(ch)
                    }
                    sb.toString()
                }
                Text(
                    text = if (isBn) "স্বয়ংক্রিয়ভাবে বন্ধ হবে: $countdownBn সেকেন্ড" else "Auto dismiss in: ${callCountdown}s",
                    color = textSecondary,
                    fontSize = 12.sp
                )
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isDarkTheme) Color(0xFF27272A) else Color(0xFFE2E8F0))
                        .clickable { onDismiss() }
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = if (isBn) "বন্ধ করুন" else "Dismiss",
                        color = textPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
