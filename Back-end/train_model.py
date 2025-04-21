from transformers import XLMRobertaTokenizerFast, XLMRobertaForQuestionAnswering, TrainingArguments, Trainer
from datasets import Dataset, DatasetDict
import torch

# 1. تحميل التوكنيزر والنموذج
model_name = "deepset/xlm-roberta-base-squad2"
tokenizer = XLMRobertaTokenizerFast.from_pretrained(model_name)
model = XLMRobertaForQuestionAnswering.from_pretrained(model_name)

# 2. إعداد بيانات التدريب (موسعة)
data = {
    "context": [
        "للحفاظ على نظام الهيدروليك في الحفارة، يجب فحص الزيوت كل 500 ساعة وتغيير الفلاتر بانتظام.",
        "إذا ارتفعت درجة حرارة محرك الحفارة، تحقق من مستويات سائل التبريد ونظف المشع.",
        "تسرب الزيت في الشيول قد ينجم عن خراطيم تالفة، ويُعالج باستبدال الخراطيم.",
        "عطل البطارية في البلدوزر يتطلب فحص الأسلاك والشحن الكهربائي.",
        "الجرافة في الحفارة قد تتوقف بسبب مضخة الهيدروليك التالفة، وتحتاج إلى صيانة فورية.",
        "المشع هو جزء مهم في تبريد المحرك، وينبغي تنظيفه من الغبار كل شهر.",
        "إذا كان هناك اهتزاز في المحرك، تحقق من العمود المرفقي والمكابس.",
        "الكرين يحتاج إلى فحص الحبال المعدنية لتجنب الكسور كل 200 ساعة عمل.",
        "انسداد الفلاتر في الحفارة يؤدي إلى ضعف أداء النظام الهيدروليك، ويُعالج بتغيير الفلاتر.",
        "تآكل العجلات في الشيول يتطلب استبدالها إذا تجاوزت 50% من السطح."
    ],
    "question": [
        "كيف أحافظ على نظام الهيدروليك؟",
        "ماذا أفعل إذا ارتفعت درجة حرارة المحرك؟",
        "ما الذي يسبب تسرب الزيت في الشيول؟",
        "كيف أصلح عطل البطارية في البلدوزر؟",
        "لماذا تتوقف الجرافة في الحفارة؟",
        "ما دور المشع في المحرك؟",
        "ما الذي أتحقق منه إذا كان هناك اهتزاز في المحرك؟",
        "كيف أعتني بحبال الكرين؟",
        "ما الذي يحدث عند انسداد الفلاتر؟",
        "كيف أتعامل مع تآكل العجلات في الشيول؟"
    ],
    "answers": [
        {"text": "فحص الزيوت كل 500 ساعة وتغيير الفلاتر بانتظام", "start_position": 0, "end_position": 38},
        {"text": "تحقق من مستويات سائل التبريد ونظف المشع", "start_position": 27, "end_position": 63},
        {"text": "خراطيم تالفة", "start_position": 23, "end_position": 36},
        {"text": "فحص الأسلاك والشحن الكهربائي", "start_position": 25, "end_position": 46},
        {"text": "مضخة الهيدروليك التالفة", "start_position": 29, "end_position": 50},
        {"text": "تبريد المحرك", "start_position": 23, "end_position": 34},
        {"text": "العمود المرفقي والمكابس", "start_position": 34, "end_position": 52},
        {"text": "فحص الحبال المعدنية كل 200 ساعة عمل", "start_position": 21, "end_position": 47},
        {"text": "ضعف أداء النظام الهيدروليك، ويُعالج بتغيير الفلاتر", "start_position": 17, "end_position": 52},
        {"text": "استبدال العجلات إذا تجاوزت 50% من السطح", "start_position": 13, "end_position": 43}
    ]
}

# تحويل البيانات إلى مجموعة بيانات
dataset = Dataset.from_dict(data)

# تقسيم البيانات إلى تدريب وتقييم (80% تدريب، 20% تقييم)
datasets = dataset.train_test_split(test_size=0.2)
train_dataset = datasets["train"]
eval_dataset = datasets["test"]

# 3. معالجة البيانات لتناسب النموذج
def preprocess_function(examples):
    questions = [q.strip() for q in examples["question"]]
    contexts = [c.strip() for c in examples["context"]]
    encodings = tokenizer(questions, contexts, truncation=True, padding=True, max_length=512, return_tensors="pt")
    
    start_positions = []
    end_positions = []
    for i in range(len(examples["answers"])):
        start_idx = examples["answers"][i]["start_position"]
        end_idx = examples["answers"][i]["end_position"]
        start_positions.append(start_idx)
        end_positions.append(end_idx)
    
    encodings.update({"start_positions": start_positions, "end_positions": end_positions})
    return encodings

tokenized_train_dataset = train_dataset.map(preprocess_function, batched=True, remove_columns=train_dataset.column_names)
tokenized_eval_dataset = eval_dataset.map(preprocess_function, batched=True, remove_columns=eval_dataset.column_names)

# 4. إعداد وسائط التدريب
training_args = TrainingArguments(
    output_dir="./results",
    evaluation_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=4,
    num_train_epochs=5,  # زيادة العصور لتحسين التدريب
    weight_decay=0.01,
    logging_dir='./logs',
    logging_steps=10,
)

# 5. إعداد المدرب
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train_dataset,
    eval_dataset=tokenized_eval_dataset,
)

# 6. بدء التدريب
trainer.train()

# 7. حفظ النموذج
model.save_pretrained("./my_finetuned_model")
tokenizer.save_pretrained("./my_finetuned_model")