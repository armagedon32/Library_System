import random
from datetime import datetime, timedelta
from pymongo import MongoClient
import os

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/library-system')

categories = ['Monograph', 'Reference', 'Periodical', 'Thesis', 'Technical Report', 'Conference Paper']
departments = ['Education', 'BSBA', 'BSHM', 'Computer Science']
conditions = ['New', 'Good', 'Fair', 'Poor']

book_templates = {
    'Education': [
        'Foundations of Education', 'Curriculum Development', 'Educational Psychology',
        'Classroom Management Strategies', 'Assessment and Evaluation', 'Child Development',
        'Teaching Methodologies', 'Educational Technology', 'Special Education',
        'Language and Literacy Development', 'Social Studies Education', 'Science Teaching',
        'Mathematics Education', 'Early Childhood Education', 'Adult Learning Theory',
        'Philippine Educational System', 'Multicultural Education', 'Research in Education',
        'Instructional Design', 'Educational Leadership'
    ],
    'BSBA': [
        'Principles of Management', 'Business Ethics and Values', 'Financial Accounting',
        'Marketing Management', 'Human Resource Management', 'Operations Management',
        'Business Analytics', 'Organizational Behavior', 'Strategic Management',
        'Entrepreneurship', 'Business Law and Taxation', 'Managerial Economics',
        'Supply Chain Management', 'Total Quality Management', 'International Business',
        'Small Business Management', 'Business Communication', 'Corporate Finance',
        'Project Management', 'Consumer Behavior'
    ],
    'BSHM': [
        'Introduction to Hospitality Management', 'Food and Beverage Service',
        'Housekeeping Operations', 'Front Office Management', 'Tourism Planning',
        'Hotel and Restaurant Management', 'Event Management', 'Culinary Arts',
        'Wine and Beverage Management', 'Hospitality Marketing', 'Room Division Management',
        'Travel Agency Operations', 'Hospitality Accounting', 'Food Safety and Sanitation',
        'Sustainable Tourism', 'Hospitality Law', 'Convention Management',
        'Banquet and Catering Services', 'Tour Guiding', 'Resort Management'
    ],
    'Computer Science': [
        'Introduction to Programming', 'Data Structures and Algorithms', 'Database Management',
        'Software Engineering', 'Web Development', 'Artificial Intelligence',
        'Computer Networks', 'Operating Systems', 'Object-Oriented Programming',
        'Machine Learning', 'Cybersecurity Fundamentals', 'Mobile App Development',
        'Human-Computer Interaction', 'Cloud Computing', 'Data Science',
        'Computer Architecture', 'Discrete Mathematics', 'Programming Languages',
        'Software Testing', 'Network Security', 'Computer Graphics',
        'Distributed Systems', 'Compiler Design', 'Computer Vision',
        'Natural Language Processing', 'Blockchain Technology',
        'Internet of Things', 'Big Data Analytics', 'Robotics',
        'Embedded Systems', 'Quantum Computing', 'DevOps Engineering',
        'Software Architecture', 'Agile Methodologies'
    ]
}

descriptions_by_dept = {
    'Education': [
        'A comprehensive guide to modern teaching methods and classroom instruction.',
        'Covers curriculum design, student assessment, and effective learning strategies.',
        'Explores child development theories and their application in the classroom.',
        'Focuses on pedagogical approaches, instructional techniques, and teacher training.',
        'Examines educational technology integration and student learning outcomes.',
        'Discusses special education, inclusive classrooms, and diverse learning needs.',
        'Covers educational leadership, school administration, and policy making.',
        'Explores language acquisition, literacy programs, and reading development.',
        'Focuses on mathematics and science teaching methodologies.',
        'Examines early childhood education theories and practices.',
    ],
    'BSBA': [
        'An introduction to business management, organizational behavior, and strategy.',
        'Covers financial accounting, marketing management, and business operations.',
        'Explores entrepreneurship, business planning, and small business management.',
        'A study of human resource management, leadership, and organizational development.',
        'Examines supply chain management, logistics, and total quality management.',
        'Covers business law, taxation, and legal aspects of commerce.',
        'Discusses consumer behavior, market research, and brand management.',
        'Explores international business and global market strategies.',
        'Focuses on corporate finance, investment analysis, and risk management.',
        'Covers business communication, negotiation, and presentation skills.',
        'Examines e-commerce, digital marketing, and online business strategies.',
    ],
    'BSHM': [
        'An introduction to hotel operations, hospitality services, and guest relations.',
        'Covers food and beverage service, culinary techniques, and kitchen management.',
        'Explores tourism planning, destination marketing, and travel industry operations.',
        'A study of housekeeping, front office management, and room division operations.',
        'Examines event planning, banquet services, and convention management.',
        'Discusses food safety standards, sanitation practices, and health regulations.',
        'Focuses on hospitality marketing, revenue management, and customer service.',
        'Covers resort management, tour guiding, and sustainable tourism.',
        'Explores wine and beverage management, bartending, and mixology.',
        'Excludes hospitality law, ethics, and industry regulations.',
        'Covers cruise line operations, airline services, and transportation management.',
    ],
    'Computer Science': [
        'An introduction to programming concepts, algorithms, and software development.',
        'Covers data structures, database management, and system architecture design.',
        'Explores web development, mobile applications, and modern software frameworks.',
        'A study of computer networks, cybersecurity, and information security.',
        'Examines artificial intelligence, machine learning, and data science.',
        'Discusses operating systems, cloud computing, and distributed systems.',
        'Focuses on software engineering principles, testing, and quality assurance.',
        'Covers object-oriented programming, design patterns, and software architecture.',
        'Explores computer graphics, visualization, and multimedia systems.',
        'Examines blockchain, cryptocurrency, and decentralized applications.',
        'Covers DevOps, CI/CD pipelines, and cloud infrastructure.',
        'Explores natural language processing and chatbot development.',
    ]
}

authors_by_dept = {
    'Education': ['Dr. Maria Santos', 'Prof. Juan Cruz', 'Dr. Ana Gonzales', 'Prof. Luis Reyes',
                   'Dr. Sofia Mercado', 'Prof. Jose Rizal', 'Dr. Amelia Lopez'],
    'BSBA': ['Dr. Carlos Mendoza', 'Prof. Sofia Lopez', 'Dr. Miguel Tan', 'Prof. Angela Cruz',
              'Dr. Ricardo Bautista', 'Prof. Maria Gonzales'],
    'BSHM': ['Chef Antonio Reyes', 'Prof. Maria Flores', 'Dr. Elena Garcia', 'Chef Roberto Santos',
              'Chef Anna de Leon', 'Prof. Carlos Villanueva'],
    'Computer Science': ['Dr. John Villanueva', 'Prof. Mark Garcia', 'Dr. Lisa Chen', 'Prof. Dave Torres',
                          'Dr. Paulo Reyes', 'Prof. Sarah Lim']
}

publishers_by_dept = {
    'Education': ['Rex Publishing', 'C&E Publishing', 'Lorimar Publishing'],
    'BSBA': ['Rex Publishing', 'C&E Publishing', 'McGraw-Hill PH'],
    'BSHM': ['Anvil Publishing', 'Rex Publishing', 'C&E Publishing'],
    'Computer Science': ['MIT Press PH', 'Pearson PH', 'Wiley PH', 'Springer PH']
}


def random_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))


def add_books(count=10):
    client = MongoClient(MONGO_URI)
    db = client.get_default_database()

    existing_count = db.collectionitems.count_documents({})
    print(f'Existing books in database: {existing_count}')

    item_ids = []
    for i in range(count):
        dept = random.choice(departments)
        title = random.choice(book_templates[dept])
        author = random.choice(authors_by_dept[dept])
        publisher = random.choice(publishers_by_dept[dept])
        description = random.choice(descriptions_by_dept[dept])
        category = random.choice(categories)
        publish_year = random.randint(2000, 2024)
        total_borrows = random.randint(0, 50)
        total_renewals = random.randint(0, total_borrows)
        avg_dwell = random.randint(1, 30)
        usage_score = total_borrows * 0.5 + total_renewals * 0.3 + avg_dwell * 0.2
        retention = random.randint(70, 100) if usage_score > 15 else random.randint(0, 40)

        if usage_score < 5:
            status = 'Recommend Retire'
        elif usage_score > 15:
            status = 'Recommend Keep'
        elif usage_score > 8:
            status = 'Flagged for Review'
        else:
            status = 'Active'

        result = db.collectionitems.insert_one({
            'title': title,
            'author': author,
            'isbn': f'978-{random.randint(1000000000, 9999999999)}',
            'category': category,
            'department': dept,
            'description': description,
            'publishYear': publish_year,
            'publisher': publisher,
            'location': f'Shelf {chr(65 + (existing_count + i) % 6)}-{random.randint(1, 20)}',
            'condition': random.choice(conditions),
            'cost': random.randint(50, 500),
            'copies': random.randint(1, 5),
            'status': status,
            'cluster': -1,
            'usageMetrics': {
                'totalBorrows': total_borrows,
                'totalRenewals': total_renewals,
                'averageDwellTime': avg_dwell,
                'lastUsed': random_date(datetime(2023, 1, 1), datetime.now()),
                'usageScore': round(usage_score, 2),
                'retentionScore': retention
            },
            'createdAt': datetime.utcnow()
        })
        item_ids.append(result.inserted_id)

    new_count = db.collectionitems.count_documents({})
    print(f'Added {count} books successfully!')
    print(f'Total books now: {new_count}')
    client.close()


if __name__ == '__main__':
    import sys
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    print(f'Adding {count} books to production database...')
    add_books(count)
