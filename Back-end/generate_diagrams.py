from graphviz import Digraph

# إنشاء مخطط Use Case Diagram
use_case_diagram = Digraph('UseCaseDiagram', format='png')
use_case_diagram.attr(rankdir='LR', size='10')

# إضافة الممثلين (Actors)
use_case_diagram.node('Customer', 'Customer', shape='actor')
use_case_diagram.node('Admin', 'Admin', shape='actor')

# إضافة حالات الاستخدام (Use Cases)
use_cases = {
    'Browse': 'Browse Products',
    'Search': 'Search for Products',
    'ViewDetails': 'View Product Details',
    'AddToCart': 'Add to Cart',
    'Checkout': 'Checkout & Payment',
    'TrackOrder': 'Track Order',
    'CustomerSupport': 'Customer Support',
    'ManageProducts': 'Manage Products',
    'ManageOrders': 'Manage Orders',
    'ApplyDiscounts': 'Apply Discounts',
    'GenerateReports': 'Generate Reports & Analytics'
}

for key, value in use_cases.items():
    use_case_diagram.node(key, value, shape='ellipse')

# ربط العملاء بحالات الاستخدام
customer_relationships = [
    ('Customer', 'Browse'),
    ('Customer', 'Search'),
    ('Customer', 'ViewDetails'),
    ('Customer', 'AddToCart'),
    ('Customer', 'Checkout'),
    ('Customer', 'TrackOrder'),
    ('Customer', 'CustomerSupport')
]

admin_relationships = [
    ('Admin', 'ManageProducts'),
    ('Admin', 'ManageOrders'),
    ('Admin', 'ApplyDiscounts'),
    ('Admin', 'GenerateReports')
]

for actor, use_case in customer_relationships + admin_relationships:
    use_case_diagram.edge(actor, use_case)

# حفظ مخطط Use Case
use_case_diagram.render('Use_Case_Diagram', format='png')

# إنشاء مخطط Flow Chart
flow_chart = Digraph('FlowChart', format='png')
flow_chart.attr(rankdir='TB', size='8')

# إضافة العقد (Nodes)
flow_chart.node('Start', 'Start', shape='ellipse')
flow_chart.node('Browse', 'Browse Products', shape='parallelogram')
flow_chart.node('Search', 'Search for Product', shape='diamond')
flow_chart.node('ViewDetails', 'View Product Details', shape='parallelogram')
flow_chart.node('AddToCart', 'Add Product to Cart', shape='rectangle')
flow_chart.node('Checkout', 'Proceed to Checkout', shape='diamond')
flow_chart.node('Payment', 'Make Payment', shape='rectangle')
flow_chart.node('Confirm', 'Order Confirmed?', shape='diamond')
flow_chart.node('Shipping', 'Process & Ship Order', shape='rectangle')
flow_chart.node('End', 'End', shape='ellipse')

# ربط العقد
flow_chart.edges([
    ('Start', 'Browse'),
    ('Browse', 'Search'),
    ('Search', 'ViewDetails'),
    ('Search', 'Browse'),
    ('ViewDetails', 'AddToCart'),
    ('AddToCart', 'Checkout'),
    ('Checkout', 'Payment'),
    ('Payment', 'Confirm'),
    ('Confirm', 'Shipping'),
    ('Shipping', 'End')
])

# حفظ مخطط Flow Chart
flow_chart.render('Flow_Chart', format='png')

print("The diagrams were successfully generated!")
