import os
import json
import kagglehub
import pandas as pd

try:
    print("Downloading dataset...")
    # Download the dataset using kagglehub
    path = kagglehub.dataset_download("syedmharis/software-engineering-interview-questions-dataset")
    print(f"Dataset downloaded to: {path}")

    # Inspect the directory for a CSV file
    files = [f for f in os.listdir(path) if f.endswith('.csv')]
    
    if not files:
        print("No CSV files found in the dataset.")
        exit(1)
        
    csv_file_path = os.path.join(path, files[0])
    print(f"Loading {csv_file_path}...")
    
    df = pd.read_csv(csv_file_path, encoding='latin1')
    
    # Save the questions to a JSON file the app can read
    target_dir = os.path.join(os.getcwd(), "my-app", "lib")
    os.makedirs(target_dir, exist_ok=True)
    target_file = os.path.join(target_dir, "interview_questions.json")
    
    # Selecting the first 100 questions to avoid too large of a file initially
    questions = df.head(100).to_dict(orient="records")
    
    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2)
        
    print(f"Saved {len(questions)} questions to {target_file}")
    
except Exception as e:
    print(f"An error occurred: {e}")
