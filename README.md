# 🌱 PlantGuard AI – Plant Disease Detection

An end-to-end **AI/ML project** that detects plant diseases from leaf images using a **CNN-based image classification model**.

The project focuses primarily on the Machine Learning pipeline, including image preprocessing, CNN-based classification, model training, prediction, confidence estimation, and integration into a functional web application.

This is **Version 1** of the project, with several improvements and additional features planned for future versions.

---

## 🚀 Project Highlights

- End-to-End Deep Learning Pipeline
- CNN-Based Image Classification
- Image Preprocessing
- TensorFlow / Keras
- Model Training and Evaluation
- Disease Classification
- Prediction Confidence
- Treatment & Prevention Information
- FastAPI Backend
- MongoDB Database
- Next.js / React Frontend
- AI-Assisted Application Development
- User Authentication
- Prediction History

---

## 🌿 Project Overview

PlantGuard AI allows users to upload a plant leaf image and receive an AI-based disease analysis.

### Workflow

```text
Leaf Image
    ↓
Image Preprocessing
    ↓
CNN Model
    ↓
Class Probabilities
    ↓
Disease Prediction
    ↓
Confidence Score
    ↓
Treatment & Prevention

The system processes the uploaded image and uses the trained CNN model to determine the most likely disease class.
```

🧠 Machine Learning

The main focus of this project is the Deep Learning component.

### ML Pipeline

- Image preprocessing
- Image resizing
- Pixel normalization
- CNN-based feature extraction
- Multi-class classification
- Probability generation
- Disease prediction
- Confidence calculation

The model returns probabilities for the available classes. The class with the highest probability is selected as the predicted disease.


📊 Model Performance
Metric	Score
Accuracy	 **90%**


Prediction Example

```text
Predicted Disease:
Pepper Bell – Bacterial Spot

Confidence:
99.9%
```

The confidence score represents the model's prediction probability for the selected class and should not be confused with the overall model accuracy.

🌱 Supported Classes

The current Version 1 model/application supports classes including:

| Plant | Disease / Condition |
|-------|---------------------|
| Pepper Bell | Bacterial Spot |
| Pepper Bell | Healthy |
| Potato | Early Blight |
| Potato | Late Blight |
| Potato | Healthy |
| Tomato | Healthy |

More plant and disease classes are planned for future versions.

💡 Application Features

The current application allows users to:

- Upload plant leaf images
- Detect possible plant diseases
- View prediction confidence
- View disease descriptions
- View symptoms
- View treatment information
- View prevention recommendations
- Store prediction history
- Manage user accounts

## 🛠️ Technologies Used

### 🤖 AI / Machine Learning

* Python
* TensorFlow
* Keras
* Convolutional Neural Networks (CNN)
* NumPy
* Image Preprocessing
* Deep Learning

### ⚙️ Backend

* Python
* FastAPI
* MongoDB

### 💻 Frontend

* Next.js
* React

### 🔧 Development & Version Control

* Git
* GitHub

---

## 🤖 AI-Assisted Development

AI-assisted development tools were used during the development of the application to support various aspects of the software engineering process, including:

* Frontend development
* Backend implementation
* API integration
* UI development
* Debugging and troubleshooting
* Development assistance

The **primary technical focus of the project was the Machine Learning pipeline**, including model training, image preprocessing, prediction, and integration of the trained model into a full-stack application.

---

## ▶️ How to Run

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/shiddukuppast/PlantHealth_AI.git
cd PlantHealth_AI
```

### 2️⃣ Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate the virtual environment on Windows:

```bash
.venv\Scripts\activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

The backend will start on the local development server.

### 3️⃣ Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the dependencies:

```bash
npm install
```

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at:

**http://localhost:3000**

---

## 🔮 Version 2 – Future Improvements

PlantGuard AI is currently in **Version 1**. The following improvements are planned for future versions:

* 📈 Improve model accuracy
* 🌱 Add more plant disease classes
* 📷 Improve performance on real-world images
* 🎯 Improve prediction confidence calibration
* 💡 Provide more intelligent treatment recommendations
* 📊 Add plant health analytics
* 📱 Improve mobile responsiveness and support
* 🛰️ Integrate satellite imagery
* 🌾 Add crop health monitoring
* 🛰️ Explore NDVI-based crop health analysis
* ⚡ Improve overall application performance

---

## 📌 Current Limitations

* Version 1 supports a limited number of plant disease classes.
* Model performance may vary when images differ significantly from the training dataset.
* A high-confidence prediction does not guarantee that the prediction is correct.
* Treatment and disease information is provided for **informational purposes only** and should not replace professional agricultural advice.

---

## 📚 What I Learned

Working on PlantGuard AI helped me gain practical experience in:

* 🧠 CNN-based image classification
* 🤖 Deep Learning
* 🖼️ Image preprocessing
* 🏋️ Model training
* 📊 Model evaluation
* 🎯 Prediction probability analysis
* 🔗 Machine Learning model integration
* ⚡ FastAPI backend development
* 🗄️ MongoDB database integration
* ⚛️ Next.js and React development
* 🔌 Frontend–backend API integration
* 🧰 Git and GitHub
* 🤖 AI-assisted software development
* 🚀 Building an end-to-end AI-powered application



👨‍💻 Author

Siddesh Kuppast

B.Tech – Artificial Intelligence & Machine Learning
REVA University

GitHub

https://github.com/shiddukuppast

LinkedIn

https://www.linkedin.com/in/shiddu-kuppast-139164333/

📌 Version

Current Version: v1.0

PlantGuard AI is an ongoing project, and more features and improvements are planned for Version 2.

⭐ If you find this project interesting, consider giving the repository a star!