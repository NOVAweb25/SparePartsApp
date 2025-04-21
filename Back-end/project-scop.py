from graphviz import Digraph

# إنشاء خريطة مفاهيم لتطبيق بيع قطع غيار المعدات الثقيلة
concept_map = Digraph('ConceptMap', format='png')
concept_map.attr(rankdir='TB', size='10')

# العقد الرئيسية
concept_map.node('AppDesign', 'تصميم وتطوير التطبيق', shape='box', style='filled', color='lightblue')
concept_map.node('ShippingIntegration', 'التكامل مع شركات الشحن ومنصات التقسيط', shape='box', style='filled', color='lightgreen')
concept_map.node('Features', 'إضافة خصائص متقدمة', shape='box', style='filled', color='lightyellow')
concept_map.node('AdminPanel', 'تطوير لوحة إدارة للشركة', shape='box', style='filled', color='lightcoral')
concept_map.node('MaintenanceSupport', 'قسم الصيانة والدعم الفني', shape='box', style='filled', color='lightpink')

# العقد الفرعية
concept_map.node('ShippingCompanies', 'شركات الشحن (سمسا، أرامكس)', shape='ellipse')
concept_map.node('InstallmentPlatforms', 'منصات التقسيط (تمارا، تابي)', shape='ellipse')
concept_map.node('AdvancedSearch', 'بحث متقدم', shape='ellipse')
concept_map.node('CustomOffers', 'عروض مخصصة', shape='ellipse')
concept_map.node('CustomerSupport', 'دعم العملاء', shape='ellipse')
concept_map.node('OrderManagement', 'إدارة الطلبات', shape='ellipse')
concept_map.node('ProductManagement', 'إدارة المنتجات', shape='ellipse')
concept_map.node('OfferManagement', 'إدارة العروض', shape='ellipse')
concept_map.node('AIMonitoring', 'متابعة باستخدام الذكاء الاصطناعي', shape='ellipse')
concept_map.node('TechSupport', 'الدعم الفني', shape='ellipse')

# ربط العقد
concept_map.edge('AppDesign', 'ShippingIntegration')
concept_map.edge('AppDesign', 'Features')
concept_map.edge('AppDesign', 'AdminPanel')
concept_map.edge('AppDesign', 'MaintenanceSupport')

concept_map.edge('ShippingIntegration', 'ShippingCompanies')
concept_map.edge('ShippingIntegration', 'InstallmentPlatforms')

concept_map.edge('Features', 'AdvancedSearch')
concept_map.edge('Features', 'CustomOffers')
concept_map.edge('Features', 'CustomerSupport')

concept_map.edge('AdminPanel', 'OrderManagement')
concept_map.edge('AdminPanel', 'ProductManagement')
concept_map.edge('AdminPanel', 'OfferManagement')

concept_map.edge('MaintenanceSupport', 'AIMonitoring')
concept_map.edge('MaintenanceSupport', 'TechSupport')

# حفظ الخريطة
concept_map.render('Concept_Map', format='png')

print("✅ تم إنشاء خريطة المفاهيم بنجاح! ستجد الصورة في نفس المجلد.")
