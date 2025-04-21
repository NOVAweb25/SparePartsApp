/* JavaScript (maintenance.js) */
document.addEventListener('DOMContentLoaded', () => {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const closeChatBtn = document.querySelector('.close-chat');

    // عرض نافذة الدردشة تلقائيًا عند دخول الزائر مع تأثير انزلاق
    setTimeout(() => {
        chatWindow.classList.add('visible');
    }, 1000);

    // إظهار زر الدردشة بعد فترة قصيرة مع تأثير تكبير بسيط
    setTimeout(() => {
        chatToggle.style.opacity = 1;
        chatToggle.classList.add('show');
    }, 1500);

    // زر لفتح/إغلاق نافذة الدردشة عند الضغط عليه
    chatToggle.addEventListener('click', () => {
        chatWindow.classList.toggle('visible');  // تبديل بين الفتح والإغلاق
    });

    // زر لإغلاق نافذة الدردشة عند النقر على (X)
    closeChatBtn.addEventListener('click', () => {
        chatWindow.classList.remove('visible');  // إغلاق النافذة فقط
chatWindow.classList.toggle('visible');
    });
});



function sendMessage() {
    const userInput = document.getElementById('chat-input').value;
    const chatContent = document.getElementById('chat-content');

    if (userInput.trim()) {
        const userMessage = document.createElement('div');
        userMessage.className = 'message user';
        userMessage.textContent = userInput;
        chatContent.appendChild(userMessage);

        const botMessage = document.createElement('div');
        botMessage.className = 'message bot';
        botMessage.textContent = `جارٍ معالجة استفسارك: "${userInput}". سيتم الرد قريبًا.`;
        chatContent.appendChild(botMessage);

        document.getElementById('chat-input').value = '';
        chatContent.scrollTop = chatContent.scrollHeight;
    }
}

function filterCategory(category) {
    alert(`تم اختيار قسم: ${category}`);
    // هنا يمكن إضافة وظيفة لعرض نصائح أو قطع مخصصة لهذا القسم
}

function findPart() {
    const partQuery = document.getElementById('part-search').value;
    const partResults = document.getElementById('part-results');

    if (partQuery.trim()) {
        partResults.innerHTML = `<p>نتائج البحث عن: "${partQuery}"</p>`;
    } else {
        partResults.innerHTML = '<p>يرجى إدخال اسم أو رقم القطعة للبحث.</p>';
    }
}
