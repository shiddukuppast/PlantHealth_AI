export type Language = 'en' | 'kn' | 'hi'

export interface LanguageOption {
  code: Language
  label: string
  nativeName: string
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिंदी' },
]

export const translations = {
  en: {
    // Branding & Header
    appName: 'PlantHealth AI',
    appTagline: 'Farmer Crop Health Assistant',
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    greetingNamaste: 'Namaste',
    welcomeBack: 'Welcome to PlantHealth AI',
    welcomeSubtitle: "Let's keep your crops healthy and productive today.",
    farmerWorkspace: 'Farmer Workspace',
    logout: 'Log out',
    selectLanguage: 'Language',

    // Weather Card
    weatherTitle: 'Field Weather Advisory',
    weatherUnavailable: 'Weather data unavailable',
    weatherLoading: 'Checking local weather...',
    weatherContextNote: 'Live agricultural weather for your field',
    humidity: 'Humidity',
    wind: 'Wind Speed',
    rain: 'Rainfall',
    temp: 'Temperature',
    feelsLike: 'Feels like',

    // Crop Health Section (Hero)
    checkHealthTitle: 'Check Your Crop Health',
    checkHealthSubtitle:
      'Upload a clear photo of an affected plant leaf or scan using your phone camera to identify crop diseases and get expert treatment advice.',
    scanCamera: 'Scan Using Camera',
    uploadImage: 'Upload Plant Image',
    orDragDrop: 'or drag and drop leaf photo here',
    photoTipsTitle: 'Tips for accurate diagnosis:',
    photoTip1: 'Take the photo in bright, natural daylight',
    photoTip2: 'Focus closely on the affected spots or symptoms',
    photoTip3: 'Avoid blurry, dark, or shaking photos',
    supportedFormats: 'JPG, JPEG, PNG · Maximum 10 MB',
    changePhoto: 'Change Photo',
    removePhoto: 'Remove Photo',
    analyzeButton: 'Check Crop Health Now',
    analyzingButton: 'Examining leaf with AI... Please wait',
    retake: 'Retake',
    browseImage: 'Browse Photo',

    // Results Section
    diagnosisReport: 'Crop Health Diagnosis Report',
    diseaseDetected: 'Disease Detected',
    pestDetected: 'Pest Detected',
    healthyCrop: 'Healthy Crop — No Disease Found',
    conditionLabel: 'Identified Crop Condition',
    confidenceLabel: 'AI Confidence',
    confidenceHigh: 'The AI is highly confident about this diagnosis.',
    confidenceModerate: 'The AI is moderately confident. Consider consulting an agricultural advisor if symptoms persist.',
    confidenceLow: 'The AI is unsure about this image. We recommend taking another clear photo in bright daylight.',
    severityLabel: 'Severity Level',
    severityMild: 'Mild — Early Stage',
    severityModerate: 'Moderate — Requires Action',
    severityHigh: 'High — Immediate Attention Needed',
    listenAdvice: 'Listen to Advice (Audio)',
    speakingAdvice: 'Playing diagnosis audio...',
    pauseSpeech: 'Pause Audio',
    resumeSpeech: 'Resume Audio',
    stopSpeech: 'Stop Audio',
    speechNotSupported: 'Speech audio is not supported in this browser.',
    aiGuidanceUnavailable: 'Detailed AI guidance is temporarily unavailable. The model prediction is shown below.',

    // Treatment & Prevention Cards
    immediateActionsTitle: '1. Immediate Actions',
    immediateActionsSubtitle: 'Steps you should take in your field today to control spread',
    treatmentTitle: '2. Treatment Recommendations',
    treatmentSubtitle: 'Recommended crop care and recovery measures',
    preventionTitle: '3. Prevention Methods',
    preventionSubtitle: 'How to protect future harvests from this disease',
    symptomsTitle: 'Observed Symptoms',
    aiInsightTitle: 'Agricultural Insight',
    expertAdviceTitle: 'When to Contact Agricultural Experts',
    expertAdviceDefault:
      'If symptoms rapidly spread across more than 20% of your crop within 2 to 3 days, or if leaf yellowing continues, contact your local Krishi Vigyan Kendra (KVK) or agricultural extension officer.',
    weatherAlertTitle: 'Weather & Spraying Advisory',

    // History Section
    historyTitle: 'Recent Crop Checks',
    historySubtitle: 'Record of your past leaf scans and diagnostic results',
    historyEmptyTitle: 'No plant checks recorded yet',
    historyEmptyDesc:
      'Once you scan a plant leaf, your health check history will be saved here so you can track your farm’s health over time.',
    viewDetails: 'View Report',
    dateLabel: 'Date',
    checkAnother: 'Scan Another Plant Leaf',
    statusDiagnosed: 'Diagnosed',
    statusHealthy: 'Healthy',

    // Invalid Image State
    invalidImageTitle: 'Photo Not Suitable for Crop Analysis',
    invalidImageSubtitle: 'Please upload a clear, focused photo of a plant leaf so the AI can inspect it properly.',
    tryAgain: 'Try Again With a Clear Leaf Photo',
    invalidTip1: 'Make sure the plant leaf is clearly visible and centered',
    invalidTip2: 'Avoid heavily blurred, obstructed, or dark photos',
    invalidTip3: 'Ensure the photo is of an actual plant leaf or crop',
  },
  kn: {
    // Branding & Header
    appName: 'ಪ್ಲಾಂಟ್ ಹೆಲ್ತ್ AI',
    appTagline: 'ರೈತರ ಬೆಳೆ ರಕ್ಷಣಾ ಸಹಾಯಕ',
    greetingMorning: 'ಶುಭೋದಯ',
    greetingAfternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ',
    greetingEvening: 'ಶುಭ ಸಂಜೆ',
    greetingNamaste: 'ನಮಸ್ಕಾರ',
    welcomeBack: 'ಸ್ವಾಗತ',
    welcomeSubtitle: 'ಇಂದು ನಿಮ್ಮ ಬೆಳೆಗಳನ್ನು ಆರೋಗ್ಯಕರವಾಗಿ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿಡೋಣ.',
    farmerWorkspace: 'ರೈತರ ಕಾರ್ಯಕ್ಷೇತ್ರ',
    logout: 'ನಿರ್ಗಮಿಸಿ',
    selectLanguage: 'ಭಾಷೆ',

    // Weather Card
    weatherTitle: 'ಹೊಲದ ಹವಾಮಾನ ಮಾಹಿತಿ',
    weatherUnavailable: 'ಹವಾಮಾನ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ',
    weatherLoading: 'ಹವಾಮಾನ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    weatherContextNote: 'ನಿಮ್ಮ ಜಮೀನಿನ ನೈಜ ಕೃಷಿ ಹವಾಮಾನ',
    humidity: 'ಗಾಳಿಯ ತೇವಾಂಶ',
    wind: 'ಗಾಳಿಯ ವೇಗ',
    rain: 'ಮಳೆ ಪ್ರಮಾಣ',
    temp: 'ತಾಪಮಾನ',
    feelsLike: 'ಅನುಭವವಾಗುವ ತಾಪಮಾನ',

    // Crop Health Section (Hero)
    checkHealthTitle: 'ನಿಮ್ಮ ಬೆಳೆಯ ಆರೋಗ್ಯ ಪರೀಕ್ಷಿಸಿ',
    checkHealthSubtitle:
      'ರೋಗಬಾಧಿತ ಎಲೆಯ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ ಅಥವಾ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ — ರೋಗ ಪತ್ತೆಹಚ್ಚಿ ಪರಿಹಾರ ಮತ್ತು ತಜ್ಞರ ಸಲಹೆ ಪಡೆಯಿರಿ.',
    scanCamera: 'ಕ್ಯಾಮೆರಾದಿಂದ ಫೋಟೋ ತೆಗೆಯಿರಿ',
    uploadImage: 'ಎಲೆಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    orDragDrop: 'ಅಥವಾ ಫೋಟೋವನ್ನು ಇಲ್ಲಿ ಎಳೆದು ಹಾಕಿ',
    photoTipsTitle: 'ನಿಖರವಾದ ರೋಗನಿರ್ಣಯಕ್ಕಾಗಿ ಸಲಹೆಗಳು:',
    photoTip1: 'ಉತ್ತಮ ನೈಸರ್ಗಿಕ ಹಗಲು ಬೆಳಕಿನಲ್ಲಿ ಫೋಟೋ ತೆಗೆಯಿರಿ',
    photoTip2: 'ಎಲೆಯ ರೋಗದ ಮಚ್ಚೆಗಳು ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣುವಂತೆ ಫೋಕಸ್ ಮಾಡಿ',
    photoTip3: 'ಅಲುಗಾಡಿದ ಅಥವಾ ಮಸುಕಾದ ಫೋಟೋಗಳನ್ನು ತಪ್ಪಿಸಿ',
    supportedFormats: 'JPG, JPEG, PNG · ಗರಿಷ್ಠ 10 MB',
    changePhoto: 'ಫೋಟೋ ಬದಲಾಯಿಸಿ',
    removePhoto: 'ಫೋಟೋ ತೆಗೆದುಹಾಕಿ',
    analyzeButton: 'ಈಗಲೇ ಬೆಳೆ ಆರೋಗ್ಯ ಪರೀಕ್ಷಿಸಿ',
    analyzingButton: 'AI ಮೂಲಕ ಎಲೆಯನ್ನು ಪರೀಕ್ಷಿಸಲಾಗುತ್ತಿದೆ... ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ',
    retake: 'ಮತ್ತೆ ತೆಗೆಯಿರಿ',
    browseImage: 'ಫೋಟೋ ಆಯ್ಕೆಮಾಡಿ',

    // Results Section
    diagnosisReport: 'ಬೆಳೆ ರೋಗ ತಪಾಸಣಾ ವರದಿ',
    diseaseDetected: 'ಬೆಳೆ ರೋಗ ಕಂಡುಬಂದಿದೆ',
    pestDetected: 'ಕೀಟ ಬಾಧೆ ಕಂಡುಬಂದಿದೆ',
    healthyCrop: 'ಆರೋಗ್ಯಕರ ಬೆಳೆ — ಯಾವುದೇ ರೋಗವಿಲ್ಲ',
    conditionLabel: 'ಪತ್ತೆಯಾದ ರೋಗ/ಸ್ಥಿತಿ',
    confidenceLabel: 'AI ನಿಖರತೆ',
    confidenceHigh: 'AI ಈ ರೋಗನಿರ್ಣಯದ ಬಗ್ಗೆ ಹೆಚ್ಚಿನ ವಿಶ್ವಾಸ ಹೊಂದಿದೆ.',
    confidenceModerate: 'AI ಸಾಧಾರಣ ವಿಶ್ವಾಸ ಹೊಂದಿದೆ. ರೋಗ ಲಕ್ಷಣಗಳು ಮುಂದುವರಿದರೆ ಕೃಷಿ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    confidenceLow: 'AI ಗೆ ಈ ಚಿತ್ರ ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟ ಬೆಳಕಿನಲ್ಲಿ ಮತ್ತೊಮ್ಮೆ ಫೋಟೋ ತೆಗೆಯಿರಿ.',
    severityLabel: 'ರೋಗದ ತೀವ್ರತೆ',
    severityMild: 'ಕಡಿಮೆ — ಆರಂಭಿಕ ಹಂತ',
    severityModerate: 'ಮಧ್ಯಮ — ತಕ್ಷಣ ಕ್ರಮ ಅಗತ್ಯ',
    severityHigh: 'ಹೆಚ್ಚು — ತಕ್ಷಣ ಚಿಕಿತ್ಸೆ ಅಗತ್ಯ',
    listenAdvice: 'ಧ್ವನಿ ಮೂಲಕ ಸಲಹೆ ಕೇಳಿ (ಆಡಿಯೋ)',
    speakingAdvice: 'ವರದಿ ಓದಲಾಗುತ್ತಿದೆ...',
    pauseSpeech: 'ವಿರಾಮಗೊಳಿಸಿ',
    resumeSpeech: 'ಮುಂದುವರಿಸಿ',
    stopSpeech: 'ನಿಲ್ಲಿಸಿ',
    speechNotSupported: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಆಡಿಯೋ ಬೆಂಬಲವಿಲ್ಲ.',
    aiGuidanceUnavailable: 'ವಿವರವಾದ AI ಮಾರ್ಗದರ್ಶನ ಸದ್ಯಕ್ಕೆ ಲಭ್ಯವಿಲ್ಲ. ಮಾದರಿಯ ಮುನ್ಸೂಚನೆಯನ್ನು ಕೆಳಗೆ ನೀಡಲಾಗಿದೆ.',

    // Treatment & Prevention Cards
    immediateActionsTitle: '1. ತಕ್ಷಣ ಕೈಗೊಳ್ಳಬೇಕಾದ ಕ್ರಮಗಳು',
    immediateActionsSubtitle: 'ರೋಗ ಹರಡುವುದನ್ನು ತಡೆಯಲು ಇಂದೇ ನಿಮ್ಮ ಜಮೀನಿನಲ್ಲಿ ಮಾಡಬೇಕಾದ ಕೆಲಸಗಳು',
    treatmentTitle: '2. ರೋಗ ನಿಯಂತ್ರಣ ಹಾಗೂ ಚಿಕಿತ್ಸೆ',
    treatmentSubtitle: 'ಬೆಳೆಯನ್ನು ರಕ್ಷಿಸಲು ಶಿಫಾರಸು ಮಾಡಲಾದ ಕ್ರಮಗಳು',
    preventionTitle: '3. ಭವಿಷ್ಯದ ರೋಗ ತಡೆಗಟ್ಟುವ ಕ್ರಮಗಳು',
    preventionSubtitle: 'ಮುಂದಿನ ಬೆಳೆಗಳಿಗೆ ಈ ರೋಗ ಬಾರದಂತೆ ತಡೆಯುವ ಉಪಾಯಗಳು',
    symptomsTitle: 'ಕಂಡುಬಂದ ರೋಗ ಲಕ್ಷಣಗಳು',
    aiInsightTitle: 'ಕೃಷಿ ತಜ್ಞರ ಸಲಹಾ ಸಾರಾಂಶ',
    expertAdviceTitle: 'ಕೃಷಿ ತಜ್ಞರನ್ನು ಯಾವಾಗ ಸಂಪರ್ಕಿಸಬೇಕು',
    expertAdviceDefault:
      'ರೋಗವು 2 ರಿಂದ 3 ದಿನಗಳಲ್ಲಿ ಶೇಕಡಾ 20 ಕ್ಕಿಂತ ಹೆಚ್ಚು ಬೆಳೆಗೆ ಹರಡಿದರೆ, ಅಥವಾ ಎಲೆ ಹಳದಿ ಬಣ್ಣಕ್ಕೆ ತಿರುಗುತ್ತಿದ್ದರೆ, ನಿಮ್ಮ ಹತ್ತಿರದ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರ (KVK) ಅಥವಾ ಕೃಷಿ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    weatherAlertTitle: 'ಹವಾಮಾನ ಮತ್ತು ಕೀಟನಾಶಕ ಸಿಂಪಡಣಾ ಸಲಹೆ',

    // History Section
    historyTitle: 'ಹಿಂದಿನ ಬೆಳೆ ತಪಾಸಣೆಗಳು',
    historySubtitle: 'ನೀವು ಹಿಂದೆ ಪರೀಕ್ಷಿಸಿದ ಎಲೆಗಳ ಇತಿಹಾಸ ಮತ್ತು ವರದಿಗಳು',
    historyEmptyTitle: 'ಯಾವುದೇ ಬೆಳೆ ತಪಾಸಣೆಗಳ ದಾಖಲೆಗಳಿಲ್ಲ',
    historyEmptyDesc:
      'ನೀವು ಬೆಳೆಯ ಎಲೆಯ ಫೋಟೋ ತೆಗೆದು ಪರೀಕ್ಷಿಸಿದ ನಂತರ, ನಿಮ್ಮ ಎಲ್ಲಾ ವರದಿಗಳು ಇಲ್ಲಿ ದಾಖಲಾಗುತ್ತವೆ.',
    viewDetails: 'ವರದಿ ನೋಡಿ',
    dateLabel: 'ದಿನಾಂಕ',
    checkAnother: 'ಇನ್ನೊಂದು ಎಲೆಯನ್ನು ಪರೀಕ್ಷಿಸಿ',
    statusDiagnosed: 'ತಪಾಸಿಸಲಾಗಿದೆ',
    statusHealthy: 'ಆರೋಗ್ಯಕರ',

    // Invalid Image State
    invalidImageTitle: 'ಚಿತ್ರ ಬೆಳೆ ಪರೀಕ್ಷೆಗೆ ಸೂಕ್ತವಾಗಿಲ್ಲ',
    invalidImageSubtitle: 'AI ಗೆ ಪರೀಕ್ಷಿಸಲು ಸಾಧ್ಯವಾಗುವಂತೆ ದಯವಿಟ್ಟು ಬೆಳೆಯ ಎಲೆಯ ಸ್ಪಷ್ಟ ಫೋಟೋವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.',
    tryAgain: 'ಸ್ಪಷ್ಟ ಎಲೆಯ ಫೋಟೋ ತೆಗೆಯಿರಿ',
    invalidTip1: 'ಎಲೆಯು ಚೌಕಟ್ಟಿನ ಮಧ್ಯದಲ್ಲಿ ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣುತ್ತಿರಲಿ',
    invalidTip2: 'ಮಸುಕಾದ ಅಥವಾ ಕತ್ತಲಾದ ಫೋಟೋಗಳನ್ನು ತಪ್ಪಿಸಿ',
    invalidTip3: 'ಚಿತ್ರವು ನಿಜವಾದ ಸಸ್ಯದ ಎಲೆಯದ್ದಾಗಿದೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ',
  },
  hi: {
    // Branding & Header
    appName: 'प्लांटहेल्थ AI',
    appTagline: 'किसान फसल स्वास्थ्य सहायक',
    greetingMorning: 'शुभ प्रभात',
    greetingAfternoon: 'शुभ दोपहर',
    greetingEvening: 'शुभ संध्या',
    greetingNamaste: 'नमस्ते',
    welcomeBack: 'स्वागत है',
    welcomeSubtitle: 'आइए आज आपकी फसलों को स्वस्थ और सुरक्षित रखें।',
    farmerWorkspace: 'किसान कार्यक्षेत्र',
    logout: 'लॉग आउट',
    selectLanguage: 'भाषा',

    // Weather Card
    weatherTitle: 'खेत का मौसम परामर्श',
    weatherUnavailable: 'मौसम की जानकारी उपलब्ध नहीं है',
    weatherLoading: 'मौसम की जांच हो रही है...',
    weatherContextNote: 'आपके खेत के लिए वास्तविक कृषि मौसम',
    humidity: 'हवा में नमी',
    wind: 'हवा की गति',
    rain: 'बारिश',
    temp: 'तापमान',
    feelsLike: 'महसूस होने वाला तापमान',

    // Crop Health Section (Hero)
    checkHealthTitle: 'अपनी फसल का स्वास्थ्य जांचें',
    checkHealthSubtitle:
      'रोगग्रस्त पत्ती की स्पष्ट फोटो लें या अपलोड करें — बीमारी पहचानें और सही उपचार व विशेषज्ञ सलाह पाएं।',
    scanCamera: 'कैमरे से फोटो लें',
    uploadImage: 'पत्ती की फोटो अपलोड करें',
    orDragDrop: 'या पत्ती की फोटो यहाँ खींचकर छोड़ें',
    photoTipsTitle: 'सटीक जांच के लिए जरूरी सुझाव:',
    photoTip1: 'अच्छी प्राकृतिक रोशनी में फोटो लें',
    photoTip2: 'पत्ती के प्रभावित हिस्से या धब्बों पर स्पष्ट फोकस रखें',
    photoTip3: 'धुंधली या हिलती हुई फोटो लेने से बचें',
    supportedFormats: 'JPG, JPEG, PNG · अधिकतम 10 MB',
    changePhoto: 'फोटो बदलें',
    removePhoto: 'फोटो हटाएं',
    analyzeButton: 'अभी फसल स्वास्थ्य जांचें',
    analyzingButton: 'AI से पत्ती की जांच हो रही है... कृपया प्रतीक्षा करें',
    retake: 'दोबारा लें',
    browseImage: 'फोटो चुनें',

    // Results Section
    diagnosisReport: 'फसल रोग निदान रिपोर्ट',
    diseaseDetected: 'फसल रोग पाया गया',
    pestDetected: 'कीट का प्रकोप पाया गया',
    healthyCrop: 'स्वस्थ फसल — कोई बीमारी नहीं मिली',
    conditionLabel: 'पहचाना गया रोग/स्थिति',
    confidenceLabel: 'AI सटीकता',
    confidenceHigh: 'AI इस जांच परिणाम को लेकर पूरी तरह आश्वस्त है।',
    confidenceModerate: 'AI मध्यम आश्वस्त है। यदि लक्षण जारी रहते हैं तो विशेषज्ञ से सलाह लें।',
    confidenceLow: 'AI इस तस्वीर को स्पष्ट रूप से नहीं पहचान सका। कृपया अच्छी रोशनी में दोबारा फोटो लें।',
    severityLabel: 'रोग की गंभीरता',
    severityMild: 'हल्का — शुरुआती अवस्था',
    severityModerate: 'मध्यम — कार्रवाई जरूरी',
    severityHigh: 'गंभीर — तुरंत उपचार आवश्यक',
    listenAdvice: 'सलाह बोलकर सुनें (ऑडियो)',
    speakingAdvice: 'निदान रिपोर्ट पढ़ी जा रही है...',
    pauseSpeech: 'रोकें',
    resumeSpeech: 'जारी रखें',
    stopSpeech: 'बंद करें',
    speechNotSupported: 'इस ब्राउज़र में ऑडियो सपोर्ट उपलब्ध नहीं है।',
    aiGuidanceUnavailable: 'विस्तृत AI सलाह अभी उपलब्ध नहीं है। मॉडल का अनुमान नीचे दिखाया गया है।',

    // Treatment & Prevention Cards
    immediateActionsTitle: '1. तुरंत किए जाने वाले उपाय',
    immediateActionsSubtitle: 'रोग फैलने से रोकने के लिए आज ही अपने खेत में उठाए जाने वाले कदम',
    treatmentTitle: '2. उपचार एवं नियंत्रण सिफारिशें',
    treatmentSubtitle: 'फसल को बचाने के लिए जरूरी उपाय',
    preventionTitle: '3. भविष्य में रोकथाम के तरीके',
    preventionSubtitle: 'आने वाली फसल को इस बीमारी से कैसे बचाएं',
    symptomsTitle: 'दिखाई देने वाले लक्षण',
    aiInsightTitle: 'कृषि विशेषज्ञ सारांश',
    expertAdviceTitle: 'कृषि विशेषज्ञ से कब संपर्क करें',
    expertAdviceDefault:
      'यदि बीमारी 2 से 3 दिनों में 20% से अधिक फसल में फैल रही है, या पत्तियां पीली पड़ रही हैं, तो तुरंत अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि अधिकारी से संपर्क करें।',
    weatherAlertTitle: 'मौसम एवं कीटनाशक छिड़काव परामर्श',

    // History Section
    historyTitle: 'हाल की फसल जांच',
    historySubtitle: 'आपकी पिछली पत्तियों की जांच और रिपोर्ट का रिकॉर्ड',
    historyEmptyTitle: 'अभी तक कोई जांच रिकॉर्ड नहीं है',
    historyEmptyDesc:
      'जब आप किसी पौधे की पत्ती की फोटो जांचेंगे, तो आपकी सभी रिपोर्ट यहां सुरक्षित रहेंगी ताकि आप सुधार देख सकें।',
    viewDetails: 'रिपोर्ट देखें',
    dateLabel: 'तारीख',
    checkAnother: 'दूसरी पत्ती की जांच करें',
    statusDiagnosed: 'जांची गई',
    statusHealthy: 'स्वस्थ',

    // Invalid Image State
    invalidImageTitle: 'फोटो फसल जांच के लिए उपयुक्त नहीं है',
    invalidImageSubtitle: 'कृपया पौधे की पत्ती की स्पष्ट फोटो अपलोड करें ताकि AI सही जांच कर सके।',
    tryAgain: 'स्पष्ट पत्ती की फोटो के साथ दोबारा प्रयास करें',
    invalidTip1: 'पत्ती कैमरे के बीच में स्पष्ट रूप से दिखाई दे',
    invalidTip2: 'धुंधली, बहुत अंधेरी या दूर से ली गई फोटो न लें',
    invalidTip3: 'तस्वीर किसी वास्तविक पौधे या फसल की पत्ती की होनी चाहिए',
  },
} as const

export type TranslationKey = keyof typeof translations.en

export function getGreeting(lang: Language = 'en'): string {
  const hour = new Date().getHours()
  const t = translations[lang]
  if (hour < 12) return t.greetingMorning
  if (hour < 17) return t.greetingAfternoon
  return t.greetingEvening
}

export function formatFarmerDate(dateString: string, lang: Language = 'en'): string {
  try {
    const date = new Date(dateString)
    const localeMap: Record<Language, string> = {
      en: 'en-IN',
      kn: 'kn-IN',
      hi: 'hi-IN',
    }
    return date.toLocaleDateString(localeMap[lang] || 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}
