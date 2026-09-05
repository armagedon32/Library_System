import math
import re

STOPWORDS = {
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
    'shall', 'should', 'may', 'might', 'this', 'that', 'these', 'those', 'it',
    'its', 'his', 'her', 'their', 'our', 'your', 'my', 'me', 'we', 'us', 'they',
    'them', 'he', 'she', 'him', 'who', 'which', 'what', 'when', 'where', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some', 'any', 'no',
    'not', 'only', 'very', 'just', 'also', 'about', 'into', 'over', 'after',
    'before', 'between', 'through', 'during', 'without', 'within', 'along',
    'among', 'upon', 'because', 'since', 'until', 'while', 'if', 'than', 'then',
    'else', 'so', 'up', 'out', 'off', 'down', 'well', 'way', 'use', 'used',
    'using', 'new', 'one', 'two', 'first', 'other', 'another', 'many', 'much',
    'such', 'like', 'including', 'various', 'different', 'important', 'related',
    'based', 'provides', 'covers', 'explores', 'focuses', 'examines',
    'discusses', 'introduces', 'studies', 'offers', 'presents', 'describes'
}


def tokenize(text):
    if not text:
        return []
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', ' ', text)
    tokens = text.split()
    return [t for t in tokens if len(t) > 2 and t not in STOPWORDS]


def compute_tf(tokens):
    tf = {}
    for t in tokens:
        tf[t] = tf.get(t, 0) + 1
    length = len(tokens)
    if length > 0:
        for t in tf:
            tf[t] /= length
    return tf


def compute_idf(documents):
    idf = {}
    n = len(documents)
    for tokens in documents:
        unique = set(tokens)
        for t in unique:
            idf[t] = idf.get(t, 0) + 1
    for t in idf:
        idf[t] = math.log(n / idf[t]) + 1
    return idf


def compute_tfidf(tf, idf):
    vector = {}
    for t, val in tf.items():
        vector[t] = val * idf.get(t, 0)
    return vector


def magnitude(vector):
    return math.sqrt(sum(v * v for v in vector.values()))


def cosine_similarity(vec1, vec2):
    dot = 0
    for t, v in vec1.items():
        if t in vec2:
            dot += v * vec2[t]
    mag1 = magnitude(vec1)
    mag2 = magnitude(vec2)
    if mag1 == 0 or mag2 == 0:
        return 0
    return dot / (mag1 * mag2)


def build_document_vectors(items):
    documents = []
    for item in items:
        content = f"{item.get('title', '')} {item.get('description', '')}"
        documents.append({
            'id': str(item.get('_id', '')),
            'tokens': tokenize(content)
        })
    idf = compute_idf([d['tokens'] for d in documents])
    vectors = {}
    for d in documents:
        tf = compute_tf(d['tokens'])
        vectors[d['id']] = compute_tfidf(tf, idf)
    return vectors, idf


DEPARTMENT_CORPUS = {
    'Computer Science': tokenize(
        'programming software computer data algorithm database network security web development application '
        'computing code digital information technology artificial intelligence machine learning cybersecurity '
        'coding server frontend backend javascript python java html css data structure operating system cloud '
        'mobile software engineering testing framework encryption programming language computer architecture'
    ),
    'BSBA': tokenize(
        'business management accounting marketing finance entrepreneurship economics organization strategy '
        'operations human resource leadership commerce administration corporate sales trade investment banking '
        'audit taxation logistics supply chain consumer advertising brand merchandising franchise business plan '
        'startup capital revenue financial analysis market research'
    ),
    'BSHM': tokenize(
        'hospitality hotel restaurant tourism food beverage culinary kitchen housekeeping front office travel '
        'event banquet catering resort accommodation guest service menu chef cooking baking pastry wine '
        'bartending cruise tour destination lodging hospitality management food safety sanitation'
    ),
    'Education': tokenize(
        'teaching learning curriculum education classroom pedagogy instruction assessment development literacy '
        'school teacher student lesson training educational tutorial lecture seminar workshop course syllabus '
        'grading evaluation module academic pedagogical early childhood special education reading comprehension'
    )
}


def classify_department(title, description):
    query_tokens = tokenize(f"{title or ''} {description or ''}")
    if not query_tokens:
        return 'Computer Science'

    all_tokens = query_tokens[:]
    for tokens in DEPARTMENT_CORPUS.values():
        all_tokens.extend(tokens)
    unique_tokens = list(set(all_tokens))

    idf = {}
    num_docs = 1 + len(DEPARTMENT_CORPUS)
    for t in unique_tokens:
        docs_containing = 1
        for tokens in DEPARTMENT_CORPUS.values():
            if t in tokens:
                docs_containing += 1
        idf[t] = math.log(num_docs / docs_containing) + 1

    query_tf = compute_tf(query_tokens)
    query_vec = compute_tfidf(query_tf, idf)

    best_dept = 'Computer Science'
    best_score = -1

    for dept, tokens in DEPARTMENT_CORPUS.items():
        dept_tf = compute_tf(tokens)
        dept_vec = compute_tfidf(dept_tf, idf)
        sim = cosine_similarity(query_vec, dept_vec)
        if sim > best_score:
            best_score = sim
            best_dept = dept

    return best_dept


def classify_category(title, description, publisher):
    content = f"{title or ''} {description or ''} {publisher or ''}".lower()
    content += ' ' + (title or '').lower()

    if any(kw in content for kw in ['thesis', 'dissertation']):
        return 'Thesis'
    if any(kw in content for kw in ['conference', 'proceedings', 'symposium']):
        return 'Conference Paper'
    if any(kw in content for kw in ['technical report', 'white paper', 'technical', 'report']):
        return 'Technical Report'
    if any(kw in content for kw in ['reference', 'encyclopedia', 'dictionary', 'handbook',
                                     'almanac', 'atlas', 'directory']):
        return 'Reference'
    if any(kw in content for kw in ['journal', 'magazine', 'periodical', 'quarterly', 'bulletin']):
        return 'Periodical'
    if any(kw in content for kw in ['introduction', 'fundamentals', 'principles', 'foundations',
                                     'essentials', 'overview', 'analysis', 'theory', 'concepts',
                                     'approach', 'methods', 'techniques', 'textbook']):
        return 'Monograph'
    return 'Other'


def run_kmeans(items, k):
    vectors, _ = build_document_vectors(items)

    all_terms = set()
    for v in vectors.values():
        all_terms.update(v.keys())
    all_terms = sorted(all_terms)

    def get_features(item):
        item_id = str(item['_id'])
        vec = vectors.get(item_id, {})
        usage = item.get('usageMetrics', {})

        usage_features = [
            usage.get('totalBorrows', 0) / 10,
            usage.get('totalRenewals', 0) / 5,
            usage.get('averageDwellTime', 0) / 100,
        ]
        content_features = [vec.get(t, 0) for t in all_terms[:10]]
        return usage_features + content_features

    features = [get_features(item) for item in items]
    if not features:
        return None

    n_features = len(features[0])
    maxes = [max(f[i] for f in features) for i in range(n_features)]
    mins = [min(f[i] for f in features) for i in range(n_features)]

    normalized = []
    for f in features:
        norm = []
        for i, v in enumerate(f):
            if maxes[i] == mins[i]:
                norm.append(0)
            else:
                norm.append((v - mins[i]) / (maxes[i] - mins[i]))
        normalized.append(norm)

    centroids = [normalized[i % len(normalized)][:] for i in range(k)]
    n = len(normalized)
    clusters = [-1] * n
    changed = True
    iterations = 0

    while changed and iterations < 100:
        changed = False
        iterations += 1

        for i, point in enumerate(normalized):
            min_dist = float('inf')
            best = 0
            for ci, centroid in enumerate(centroids):
                dist = math.sqrt(sum((point[j] - centroid[j]) ** 2 for j in range(len(point))))
                if dist < min_dist:
                    min_dist = dist
                    best = ci
            if clusters[i] != best:
                clusters[i] = best
                changed = True

        for ci in range(k):
            members = [normalized[i] for i in range(n) if clusters[i] == ci]
            if members:
                centroids[ci] = [sum(m[j] for m in members) / len(members) for j in range(len(members[0]))]

    return {
        'assignments': [{'id': str(items[i]['_id']), 'cluster': clusters[i]} for i in range(n)],
        'labels': clusters,
        'normalized': normalized,
        'centroids': centroids,
    }


def kmeans_feature(points, k):
    """Generic K-Means over numeric feature vectors. points: list of dicts {'id': str, 'features': [..]}."""
    res = kmeans_feature_full(points, k)
    if not res:
        return None
    return res['assignments']


def kmeans_feature_full(points, k):
    """K-Means returning assignments plus normalized vectors & centroids for validation metrics."""
    if not points or len(points) < k:
        return None

    ids = [p['id'] for p in points]
    raw = [p['features'] for p in points]
    n_features = len(raw[0])

    maxes = [max(r[i] for r in raw) for i in range(n_features)]
    mins = [min(r[i] for r in raw) for i in range(n_features)]
    norm = []
    for r in raw:
        row = []
        for i, v in enumerate(r):
            if maxes[i] == mins[i]:
                row.append(0)
            else:
                row.append((v - mins[i]) / (maxes[i] - mins[i]))
        norm.append(row)

    n = len(norm)
    centroids = [list(norm[i % n]) for i in range(k)]
    labels = [-1] * n
    changed = True
    iterations = 0

    while changed and iterations < 100:
        changed = False
        iterations += 1
        for i, point in enumerate(norm):
            best = 0
            best_dist = float('inf')
            for ci, c in enumerate(centroids):
                d = math.sqrt(sum((point[j] - c[j]) ** 2 for j in range(len(point))))
                if d < best_dist:
                    best_dist = d
                    best = ci
            if labels[i] != best:
                labels[i] = best
                changed = True
        for ci in range(k):
            members = [norm[i] for i in range(n) if labels[i] == ci]
            if members:
                centroids[ci] = [sum(m[j] for m in members) / len(members) for j in range(len(members[0]))]

    return {
        'assignments': [{'id': ids[i], 'cluster': labels[i]} for i in range(n)],
        'labels': labels,
        'normalized': norm,
        'centroids': centroids,
    }


def silhouette_score(points, labels):
    """Mean Silhouette coefficient in [-1, 1]. Higher is better (well-separated clusters)."""
    n = len(points)
    unique_labels = set(labels)
    if n < 2 or len(unique_labels) < 2:
        return None
    total = 0.0
    for i in range(n):
        same = [points[j] for j in range(n) if j != i and labels[j] == labels[i]]
        if not same:
            continue
        a = math.sqrt(sum((points[i][d] - s[d]) ** 2 for s in same for d in range(len(points[i]))) / len(same))
        b = float('inf')
        for cl in unique_labels:
            if cl == labels[i]:
                continue
            others = [points[j] for j in range(n) if labels[j] == cl]
            if not others:
                continue
            b = min(b, math.sqrt(sum((points[i][d] - o[d]) ** 2 for o in others for d in range(len(points[i]))) / len(others)))
        if b == float('inf'):
            continue
        total += (b - a) / max(a, b)
    return total / n


def davies_bouldin_index(points, labels):
    """Davies-Bouldin Index. Lower is better (compact, well-separated clusters)."""
    clusters = sorted(set(labels))
    if len(clusters) < 2 or not points:
        return None
    centroids = {}
    for cl in clusters:
        members = [points[i] for i in range(len(points)) if labels[i] == cl]
        centroids[cl] = [sum(m[d] for m in members) / len(members) for d in range(len(members[0]))]
    scatters = {}
    for cl in clusters:
        members = [points[i] for i in range(len(points)) if labels[i] == cl]
        c = centroids[cl]
        scatters[cl] = math.sqrt(sum(sum((m[d] - c[d]) ** 2 for d in range(len(m))) for m in members) / len(members))
    db = 0.0
    for i, cl in enumerate(clusters):
        max_val = 0.0
        for j, cl2 in enumerate(clusters):
            if i == j:
                continue
            dist = math.sqrt(sum((centroids[cl][d] - centroids[cl2][d]) ** 2 for d in range(len(centroids[cl]))))
            if dist == 0:
                continue
            max_val = max(max_val, (scatters[cl] + scatters[cl2]) / dist)
        db += max_val
    return db / len(clusters)
