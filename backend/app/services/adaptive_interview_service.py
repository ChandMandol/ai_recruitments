"""
Adaptive AI Interview Assessment Service.
Manages the dynamic, CV-based interview lifecycle:
- Round 1: 5 initial questions (Requires >= 1 correct answer, else terminates early)
- Subsequent Rounds: 2 questions each (Requires >= 1 correct answer per round)
- Maximum 20 questions total
- Automated synthesis of comprehensive AI Summary & Feedback Report
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from app.core.config import settings
from app.models.adaptive_assessment import AdaptiveAssessment, AssessmentStatus

logger = logging.getLogger("ai_recruitment_hub.adaptive_interview")

# Curated domain knowledge banks for reliable offline/fallback generation
DOMAIN_QUESTION_BANKS: Dict[str, Dict[str, List[Dict[str, str]]]] = {
    "Frontend Developer": {
        "Junior": [
            {
                "question": "What is the difference between CSS Flexbox and CSS Grid, and in what scenarios would you choose one over the other?",
                "topic": "CSS Layouts & Responsive Design",
                "model_answer": "Flexbox is one-dimensional (content-first, row or column), ideal for alignment in toolbars or navbars. CSS Grid is two-dimensional (layout-first, rows and columns), ideal for page-level structural layouts.",
            },
            {
                "question": "Explain the concept of state versus props in React or modern component-based UI libraries.",
                "topic": "React State Management",
                "model_answer": "Props are immutable parameters passed down from a parent component. State is mutable data managed locally within a component that triggers re-rendering when updated.",
            },
            {
                "question": "How does the browser event loop handle microtasks (e.g. Promises) versus macrotasks (e.g. setTimeout)?",
                "topic": "JavaScript Concurrency & Runtime",
                "model_answer": "Microtasks (Promise callbacks, queueMicrotask) run immediately after the current script and before the next rendering or macrotask (setTimeout, setInterval). All microtasks are exhausted before the next macrotask starts.",
            },
            {
                "question": "What are semantic HTML tags and why are they critical for modern web accessibility (a11y) and SEO?",
                "topic": "Web Accessibility & Semantic HTML",
                "model_answer": "Semantic tags like <main>, <header>, <nav>, and <article> give structural meaning to web content. They allow screen readers and search engine crawlers to parse navigation hierarchies properly.",
            },
            {
                "question": "What is the purpose of the key prop when rendering dynamic lists in React?",
                "topic": "Virtual DOM & Reconciliation",
                "model_answer": "The key prop provides a unique, stable identity to elements across renders, enabling the virtual DOM reconciliation algorithm to identify which items were inserted, reordered, or removed without re-rendering the whole list.",
            },
            {
                "question": "Explain how debouncing differs from throttling in handling high-frequency browser events like scrolling or resize.",
                "topic": "Frontend Performance Optimization",
                "model_answer": "Debouncing delays execution until a certain quiet period has passed since the last trigger. Throttling limits execution to a maximum of once every given time interval.",
            },
            {
                "question": "What is CORS (Cross-Origin Resource Sharing) and how does the browser handle preflight OPTIONS requests?",
                "topic": "Web Security & HTTP",
                "model_answer": "CORS is a browser security mechanism that restricts cross-origin HTTP requests. For non-simple requests (custom headers, PUT/DELETE), the browser automatically sends an OPTIONS preflight to verify server permissions.",
            },
        ],
        "Mid-Level": [
            {
                "question": "How does React Fiber architecture work under the hood, and how does it enable concurrent rendering without freezing the main thread?",
                "topic": "React Architecture & Concurrency",
                "model_answer": "React Fiber represents components as an incremental linked-list work unit structure. It allows the scheduler to pause, prioritize, and resume reconciliation during idle frames via requestIdleCallback/MessageChannel.",
            },
            {
                "question": "Compare client-side caching strategies: Cache-Control headers, Service Worker Cache API, and HTTP ETags.",
                "topic": "Caching & Network Optimization",
                "model_answer": "Cache-Control directs browser/CDN cache lifetime. ETags allow conditional 304 validation against the server. Service Worker Cache API enables programmatic offline caching and custom stale-while-revalidate strategies.",
            },
            {
                "question": "How do you systematically identify and mitigate client-side memory leaks caused by closures, listeners, or detached DOM nodes?",
                "topic": "Performance Profiling & Memory",
                "model_answer": "Using Chrome DevTools Memory Heap snapshots and Allocation Timers to detect detached DOM trees, uncleared setIntervals, or event listeners not unmounted in useEffect cleanups.",
            },
            {
                "question": "Explain how modern build tools (Vite/Rollup) perform tree-shaking using ES module static analysis.",
                "topic": "Tooling & Bundling",
                "model_answer": "ES modules have static import/export declarations that can be analyzed before runtime. The bundler builds a dependency graph, flags unreferenced exports, and drops them from the final chunk.",
            },
            {
                "question": "How do you protect a modern Single Page Application (SPA) against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF)?",
                "topic": "Frontend Security",
                "model_answer": "For XSS: sanitize user HTML, escape inputs, enforce Content Security Policy (CSP). For CSRF: use SameSite=Lax/Strict HttpOnly cookies, or anti-CSRF token headers in API mutations.",
            },
        ],
        "Senior": [
            {
                "question": "Design an enterprise micro-frontend architecture for a platform with 5 autonomous squads. How do you handle shared state, routing, and independent deployments?",
                "topic": "Enterprise Micro-Frontends & Architecture",
                "model_answer": "Use Module Federation with an app shell handling authentication, cross-application event bus for decoupled communication, shared design system as external peer dependencies, and independent CI/CD artifacts.",
            },
            {
                "question": "Explain how Server-Side Rendering (SSR), Static Site Generation (SSG), and Incremental Static Regeneration (ISR) impact Time to First Byte (TTFB) and First Contentful Paint (FCP).",
                "topic": "Rendering Paradigms & Core Web Vitals",
                "model_answer": "SSG provides lowest TTFB via edge CDN caching. SSR renders dynamic per-request HTML, improving SEO and personalized FCP at cost of higher server TTFB. ISR combines edge static speed with background stale revalidation.",
            },
        ],
    },
    "Backend Developer": {
        "Junior": [
            {
                "question": "What is the difference between relational (SQL) and non-relational (NoSQL) databases, and when would you choose each?",
                "topic": "Databases & Storage Paradigms",
                "model_answer": "SQL databases are structured, schema-enforced, and ACID compliant, ideal for transactional data with relationships. NoSQL databases offer flexible schemas and horizontal scaling, ideal for unstructured documents or high-throughput key-value lookups.",
            },
            {
                "question": "What are the core HTTP status code categories (2xx, 3xx, 4xx, 5xx) and what does each signify?",
                "topic": "REST APIs & HTTP Protocol",
                "model_answer": "2xx represents success (e.g., 200 OK, 201 Created). 3xx indicates redirection. 4xx represents client-side errors (400 Bad Request, 401 Unauthorized, 404 Not Found). 5xx represents server-side failures (500 Internal Error, 503 Service Unavailable).",
            },
            {
                "question": "Explain how database indexing works and why adding indexes can slow down write operations.",
                "topic": "Database Indexing & B-Trees",
                "model_answer": "Indexes use data structures like B-Trees to provide O(log N) lookup times. However, on every INSERT, UPDATE, or DELETE, the database must also update and balance the index tree, adding write overhead.",
            },
            {
                "question": "What is the difference between synchronous and asynchronous code execution in backend web servers?",
                "topic": "Asynchronous I/O & Concurrency",
                "model_answer": "Synchronous code blocks execution until each operation completes. Asynchronous code uses non-blocking I/O and an event loop, allowing the server to handle thousands of concurrent network connections with minimal threads.",
            },
            {
                "question": "What is hashing versus encryption, and why must user passwords never be stored using symmetric encryption?",
                "topic": "Authentication & Cryptography",
                "model_answer": "Hashing is a one-way mathematical function that cannot be reversed. Encryption is two-way and reversible with a key. Passwords must be hashed with slow algorithms (bcrypt/argon2) with salts so that compromised keys cannot decrypt them.",
            },
            {
                "question": "Explain the concept of database connection pooling and why applications shouldn't open a new TCP connection on every request.",
                "topic": "Database Performance & Resource Pooling",
                "model_answer": "Opening a new TCP database connection incurs TLS handshakes, authentication, and process overhead. Connection pooling maintains a set of reusable connections, drastically reducing latency and server CPU usage.",
            },
            {
                "question": "What is the purpose of database transactions and the ACID properties?",
                "topic": "Database ACID Guarantees",
                "model_answer": "ACID stands for Atomicity (all or nothing), Consistency (preserves constraints), Isolation (concurrent safety), and Durability (saved on disk). Transactions guarantee integrity even during crashes.",
            },
        ],
        "Mid-Level": [
            {
                "question": "How do you implement distributed caching with Redis while avoiding cache stampedes and cache penetration?",
                "topic": "Distributed Caching & Redis",
                "model_answer": "Cache penetration is mitigated by caching null values or using Bloom filters. Cache stampedes are avoided using mutex locks, probabilistic early expiration (XFetch), or staggered TTL jitter.",
            },
            {
                "question": "Explain database isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) and the anomalies each prevents.",
                "topic": "Transaction Isolation & Concurrency",
                "model_answer": "Read Committed prevents dirty reads. Repeatable Read prevents non-repeatable reads. Serializable prevents phantom reads and write skew using snapshot isolation or two-phase locking.",
            },
            {
                "question": "How does an asynchronous message broker like RabbitMQ or Apache Kafka decouple microservices, and how do you ensure idempotent message processing?",
                "topic": "Event-Driven Architecture & Idempotency",
                "model_answer": "Brokers decouple publishers and consumers asynchronously. Idempotency is guaranteed by tracking unique message IDs in a deduplication database or using upsert operations with idempotency keys.",
            },
        ],
        "Senior": [
            {
                "question": "How would you design a distributed rate limiter that handles 100,000 requests per second across multiple regional clusters?",
                "topic": "System Design & Distributed Rate Limiting",
                "model_answer": "Use a sliding-window counter algorithm with Redis cluster, local memory token-bucket caching with batched synchronization, and header-based fallback to avoid single-point bottlenecks.",
            },
            {
                "question": "Explain the CAP theorem and how you would design a system for high availability versus strong consistency in network partition scenarios.",
                "topic": "Distributed Systems & CAP Theorem",
                "model_answer": "Under network partition (P), a system must choose Consistency (reject writes if quorum is lost) or Availability (accept writes risking stale reads). Systems use Raft/Paxos for CP or Dynamo-style eventual consistency with CRDTs for AP.",
            },
        ],
    },
    "Full Stack Developer": {
        "Junior": [
            {
                "question": "Describe the full lifecycle of an HTTP request from the moment a user types a URL and presses Enter until the page renders.",
                "topic": "Web Networking & Browser Architecture",
                "model_answer": "DNS resolution -> TCP 3-way handshake -> TLS negotiation -> HTTP request sent -> Server processes route & database -> Response sent -> Browser parses HTML/CSS/JS -> DOM/CSSOM constructed -> Render tree & Paint.",
            },
            {
                "question": "What is the role of environment variables in software development, and how do you prevent sensitive credentials from leaking to git?",
                "topic": "Environment Management & Secrets",
                "model_answer": "Environment variables separate code from environment configuration (dev, test, prod). Secrets are kept in .env files ignored by .gitignore, and injected at runtime via secret managers or deployment platforms.",
            },
            {
                "question": "What is the difference between authentication (AuthN) and authorization (AuthZ)?",
                "topic": "Security Foundations",
                "model_answer": "Authentication verifies identity (who you are, e.g., login with email/password). Authorization verifies permissions (what you are allowed to do, e.g., role-based access control for Admins vs Candidates).",
            },
            {
                "question": "Explain how RESTful API design uses HTTP verbs (GET, POST, PUT, PATCH, DELETE) idempotently.",
                "topic": "RESTful API Design",
                "model_answer": "GET, PUT, and DELETE are idempotent (calling them multiple times produces the same server state). POST is not idempotent. PATCH updates partial attributes.",
            },
            {
                "question": "How do you handle pagination in APIs for large datasets, and what is the difference between offset-based and cursor-based pagination?",
                "topic": "API Pagination Strategies",
                "model_answer": "Offset pagination uses OFFSET and LIMIT, but degrades in performance on large datasets and suffers from missing/duplicate rows on insert. Cursor pagination uses an indexed pointer (ID/timestamp), maintaining O(1) seek performance.",
            },
        ],
        "Mid-Level": [
            {
                "question": "How do you architect end-to-end type safety between a TypeScript frontend and a Python/Node backend?",
                "topic": "Type Safety & API Contracts",
                "model_answer": "By generating TypeScript types from backend OpenAPI schemas via openapi-typescript or using tRPC/GraphQL schemas that guarantee compile-time sync between client and server models.",
            },
            {
                "question": "Explain WebSocket protocol handshakes and how you maintain persistent real-time bidirectional connections across auto-scaling servers.",
                "topic": "WebSockets & Pub/Sub Architecture",
                "model_answer": "WebSockets upgrade an HTTP connection via 101 Switching Protocols. Across multi-server clusters, an external Pub/Sub layer like Redis Pub/Sub or Kafka broadcasts events across worker instances.",
            },
        ],
        "Senior": [
            {
                "question": "Design an end-to-end resilient file upload system supporting resumable uploads for 5GB files with virus scanning and background transcoding.",
                "topic": "Large-Scale File Processing Architecture",
                "model_answer": "Use chunked resumable uploads (TUS protocol or S3 multipart), direct presigned URL upload to object storage, S3 event triggers to an asynchronous worker queue (Celery/SQS), and quarantined virus scanning before metadata persistence.",
            },
        ],
    },
    "DevOps & Cloud Engineer": {
        "Junior": [
            {
                "question": "What is Docker containerization and how does a container differ from a virtual machine (VM)?",
                "topic": "Containers & Virtualization",
                "model_answer": "VMs virtualize the hardware and include a full guest operating system. Containers share the host OS kernel and isolate user space using Linux cgroups and namespaces, making them lightweight and fast to boot.",
            },
            {
                "question": "Explain the key stages of a Continuous Integration and Continuous Deployment (CI/CD) pipeline.",
                "topic": "CI/CD Foundations",
                "model_answer": "Source checkout -> Linting & formatting check -> Automated unit and integration testing -> Build artifact/container image -> Vulnerability scanning -> Deploy to staging -> Automated smoke tests -> Production deployment with rollback.",
            },
            {
                "question": "What is Infrastructure as Code (IaC) and what benefits does it bring over manual cloud console configuration?",
                "topic": "Infrastructure as Code",
                "model_answer": "IaC defines cloud resources declaratively in code (e.g., Terraform). It enables version control, peer review, reproducible staging environments, and drift detection without human error.",
            },
            {
                "question": "What is the difference between horizontal scaling and vertical scaling?",
                "topic": "Cloud Scaling & Resiliency",
                "model_answer": "Vertical scaling increases the CPU/RAM of an existing server (bounded by hardware limits). Horizontal scaling adds more server instances behind a load balancer, providing elastic scalability and high availability.",
            },
            {
                "question": "What is DNS and what are the purposes of A records, CNAME records, and TXT records?",
                "topic": "Networking & DNS",
                "model_answer": "A records map a domain directly to an IPv4 address. CNAME records alias a domain to another canonical hostname. TXT records store arbitrary text, used for domain ownership verification and email security (SPF, DKIM).",
            },
        ],
        "Mid-Level": [
            {
                "question": "How do Kubernetes Deployments, ReplicaSets, Pods, and Services interact to maintain zero-downtime rolling updates?",
                "topic": "Kubernetes Architecture",
                "model_answer": "Deployments manage ReplicaSets, which maintain Pod counts. Rolling updates spawn new ReplicaSets and gradually shift traffic via readiness probes on the Service before terminating old pods.",
            },
        ],
        "Senior": [
            {
                "question": "Design a multi-region Disaster Recovery (DR) architecture with RPO < 1 minute and RTO < 5 minutes for a critical financial service.",
                "topic": "Disaster Recovery & Multi-Region",
                "model_answer": "Active-Active multi-region deployment with global DNS traffic management (Route53 latency routing), asynchronous cross-region database replication with automated failover, and continuous chaos testing.",
            },
        ],
    },
    "Data Scientist & AI Engineer": {
        "Junior": [
            {
                "question": "What is the difference between supervised, unsupervised, and reinforcement learning?",
                "topic": "Machine Learning Paradigms",
                "model_answer": "Supervised learning trains on labeled data (input-output pairs). Unsupervised learning finds latent patterns or clusters in unlabeled data. Reinforcement learning trains agents to maximize cumulative rewards through environmental feedback.",
            },
            {
                "question": "Explain the bias-variance tradeoff and how overfitting differs from underfitting.",
                "topic": "Model Generalization",
                "model_answer": "High bias leads to underfitting (model is too simple to capture patterns). High variance leads to overfitting (model memorizes noise in training data). The goal is balanced generalization on unseen validation data.",
            },
            {
                "question": "What are precision, recall, and F1-score, and why is accuracy misleading on imbalanced datasets?",
                "topic": "Evaluation Metrics",
                "model_answer": "Precision measures true positives out of predicted positives. Recall measures true positives out of actual positives. F1 is their harmonic mean. On 99% negative data, a dummy classifier predicting negative gets 99% accuracy but 0 recall.",
            },
            {
                "question": "What is the role of feature scaling (normalization vs standardization) in gradient-descent algorithms?",
                "topic": "Data Preprocessing",
                "model_answer": "Standardization centers data to zero mean and unit variance. Unscaled features with large numerical magnitudes dominate gradients, causing slow, erratic oscillations in optimization paths.",
            },
            {
                "question": "Explain the concept of embeddings in Natural Language Processing and Vector Databases.",
                "topic": "NLP & Embeddings",
                "model_answer": "Embeddings are dense numerical vector representations of text where semantically similar words or documents are positioned close to each other in high-dimensional vector space.",
            },
        ],
        "Mid-Level": [
            {
                "question": "How does the Transformer Attention mechanism (Query, Key, Value) work compared to Recurrent Neural Networks (RNNs)?",
                "topic": "Transformers & Deep Learning",
                "model_answer": "Self-attention computes dynamic affinity weights between all tokens in parallel via QK^T / sqrt(d_k), eliminating sequential bottlenecks and vanishing gradients over long horizons.",
            },
        ],
        "Senior": [
            {
                "question": "Design an enterprise RAG (Retrieval-Augmented Generation) pipeline with semantic re-ranking, hybrid search, and hallucination guardrails.",
                "topic": "LLM Systems & Enterprise RAG",
                "model_answer": "Use hybrid dense-sparse retrieval (BM25 + vector embedding), cross-encoder re-ranking, metadata filtering, chunk context preservation, and secondary evaluator models checking faithfulness against retrieved source context.",
            },
        ],
    },
}


def _get_fallback_questions(
    job_category: str,
    interview_level: str,
    cv_text: Optional[str],
    start_index: int,
    count: int,
    round_number: int,
) -> List[Dict[str, Any]]:
    """Generate curated, relevant questions matching category and level."""
    # Match category or fallback to closest
    cat_data = DOMAIN_QUESTION_BANKS.get(job_category)
    if not cat_data:
        # Check partial match
        for key in DOMAIN_QUESTION_BANKS:
            if key.lower() in job_category.lower() or job_category.lower() in key.lower():
                cat_data = DOMAIN_QUESTION_BANKS[key]
                break
    if not cat_data:
        cat_data = DOMAIN_QUESTION_BANKS["Full Stack Developer"]

    # Match level
    level_key = interview_level if interview_level in cat_data else "Junior"
    available_pool: List[Dict[str, str]] = cat_data.get(level_key, [])
    if not available_pool:
        # Fallback to any available level in that category
        available_pool = cat_data.get("Junior", []) or cat_data.get("Mid-Level", [])

    # Personalize if CV text contains specific keywords
    cv_lower = (cv_text or "").lower()

    questions: List[Dict[str, Any]] = []
    pool_len = len(available_pool)

    for i in range(count):
        idx = start_index + i
        pool_item = available_pool[(idx - 1) % pool_len]
        q_text = pool_item["question"]

        # If CV mentions a special tech and it's question 1 or 2, tailor subtly
        if cv_lower and idx == 1:
            if "react" in cv_lower and "react" not in q_text.lower():
                q_text = f"Considering your experience in web technologies: {q_text}"
            elif "python" in cv_lower and "python" not in q_text.lower():
                q_text = f"In the context of production software engineering: {q_text}"

        questions.append({
            "index": idx,
            "round_number": round_number,
            "question": q_text,
            "topic": pool_item.get("topic", job_category),
            "model_answer": pool_item.get("model_answer", "Accurate technical explanation covering key principles."),
            "candidate_answer": None,
            "is_correct": None,
            "score": None,
            "feedback": None,
        })

    return questions


async def generate_round_questions(
    job_category: str,
    interview_level: str,
    cv_text: Optional[str],
    round_number: int,
    start_index: int,
    count: int,
    api_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Generate dynamic questions using Gemini Live/REST API.
    Gracefully falls back to curated domain knowledge if Gemini is unavailable or rate-limited.
    """
    if not api_key:
        return _get_fallback_questions(job_category, interview_level, cv_text, start_index, count, round_number)

    cv_snippet = (cv_text or "")[:1500].strip()
    prompt = f"""
You are an expert technical interviewer conducting an adaptive technical interview.
Target Job Category: {job_category}
Interview Level: {interview_level}
Candidate CV Summary: {cv_snippet if cv_snippet else "General candidate profile in " + job_category}
Current Interview Round: Round {round_number}
Number of questions needed: {count}
Starting Question Index: {start_index}

Generate exactly {count} distinct, high-quality, practical interview questions tailored to the candidate's CV and target role.
For each question, provide:
1. "index": int (from {start_index} to {start_index + count - 1})
2. "question": string (clear, focused technical or behavioral question)
3. "topic": string (specific sub-topic, e.g. "React State", "Database Indexing")
4. "model_answer": string (concise benchmark answer covering essential concepts)

Output strictly valid JSON with format:
[
  {{
    "index": {start_index},
    "question": "...",
    "topic": "...",
    "model_answer": "..."
  }}
]
"""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4, "responseMimeType": "application/json"},
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                if isinstance(parsed, list) and len(parsed) >= count:
                    result = []
                    for i, q in enumerate(parsed[:count]):
                        result.append({
                            "index": start_index + i,
                            "round_number": round_number,
                            "question": q.get("question", ""),
                            "topic": q.get("topic", job_category),
                            "model_answer": q.get("model_answer", "Accurate technical explanation."),
                            "candidate_answer": None,
                            "is_correct": None,
                            "score": None,
                            "feedback": None,
                        })
                    return result
    except Exception as e:
        logger.warning(f"Gemini question generation error, falling back to curated bank: {e}")

    return _get_fallback_questions(job_category, interview_level, cv_text, start_index, count, round_number)


def is_admitted_ignorance_or_empty(text: str) -> bool:
    """
    Detects if candidate explicitly admits lack of knowledge (e.g. 'i did not know', 'i don't know', 'no idea'),
    or provided an empty, skipped, timeout, or non-substantive filler response.
    """
    raw = text.strip()
    if not raw or raw.startswith("[No answer provided") or raw.startswith("[Flagged:"):
        return True

    cleaned = re.sub(r"[^\w\s]", "", raw.lower()).strip()
    if not cleaned or len(cleaned) < 2:
        return True

    # Patterns matching admission of ignorance or skipped question
    ignorance_patterns = [
        r"\bi\s*(?:do\s*not|dont|did\s*not|didnt|have\s*no|dont\s*really)\s*know\b",
        r"\b(?:dont|dont\s*know|didnt\s*know|did\s*not\s*know|do\s*not\s*know)\b",
        r"\bi\s*(?:have\s*no|got\s*no)\s*idea\b",
        r"\bno\s*idea\b",
        r"\bno\s*clue\b",
        r"\bnot\s*sure\b",
        r"\bi\s*am\s*not\s*sure\b",
        r"\bno\s*answer\b",
        r"\bno\s*answer\s*provided\b",
        r"\bcant\s*answer\b",
        r"\bcannot\s*answer\b",
        r"\bnot\s*familiar\b",
        r"\bi\s*have\s*no\s*knowledge\b",
        r"\bunable\s*to\s*answer\b",
        r"\bpass\b",
        r"\bskip\b",
        r"\bidk\b",
        r"\bnone\b",
        r"\bna\b",
        r"\bnothing\b",
        r"\bjanina\b",
        r"\bjani\s*na\b",
    ]

    for pat in ignorance_patterns:
        if re.search(pat, cleaned):
            return True

    return False


def _evaluate_answer_offline(
    question: str,
    candidate_answer: str,
    model_answer: str,
    topic: str,
) -> Tuple[bool, float, str, str]:
    """
    Intelligent heuristic fallback evaluation when Gemini is unreachable.
    Evaluates semantic depth, keyword presence, and length.
    """
    ans = candidate_answer.strip()
    words = ans.split()
    word_count = len(words)

    # 1. Check for admitted ignorance or empty/timeout response -> STRICT 0%
    if is_admitted_ignorance_or_empty(ans):
        return (
            False,
            0.0,
            f"Candidate stated they did not know or could not answer the question regarding {topic}.",
            model_answer,
        )

    # Keyword overlap between answer and model answer/question
    model_words = set(re.findall(r"\w{4,}", model_answer.lower()))
    q_words = set(re.findall(r"\w{4,}", question.lower()))
    target_words = model_words | q_words
    ans_words = set(re.findall(r"\w{4,}", ans.lower()))

    matched_keywords = target_words.intersection(ans_words)

    # Base score calculated from substance and keywords
    if word_count >= 15 and len(matched_keywords) >= 2:
        score = min(92.0, 65.0 + (len(matched_keywords) * 6.0) + min(word_count * 0.5, 15.0))
        is_correct = True
        feedback = f"Demonstrated good conceptual understanding of {topic} with relevant technical details."
    elif word_count >= 8 and len(matched_keywords) >= 1:
        score = 62.0
        is_correct = True
        feedback = f"Acceptable foundational explanation of {topic}, though could be expanded with more depth."
    else:
        # Incorrect answer without relevant technical keywords
        score = 10.0 if word_count >= 6 else 0.0
        is_correct = False
        feedback = f"Answer touches on the subject but misses core technical mechanics of {topic}."

    return (is_correct, round(score, 1), feedback, model_answer)


async def evaluate_candidate_answer(
    question: str,
    topic: str,
    candidate_answer: str,
    model_answer: str,
    job_category: str,
    interview_level: str,
    api_key: Optional[str] = None,
) -> Tuple[bool, float, str, str]:
    """
    Evaluates candidate's answer for correctness, scoring, and constructive feedback.
    Returns: (is_correct: bool, score: float, feedback: str, model_answer: str)
    """
    # 1. IMMEDIATE CHECK: If candidate states they do not know, did not know, or no answer -> STRICT 0.0%
    if is_admitted_ignorance_or_empty(candidate_answer):
        return (
            False,
            0.0,
            f"Candidate stated they did not know or could not answer the question regarding {topic}.",
            model_answer,
        )

    if not api_key:
        return _evaluate_answer_offline(question, candidate_answer, model_answer, topic)

    prompt = f"""
You are a senior technical interviewer evaluating a candidate's interview answer.
Target Role: {job_category} ({interview_level})
Question: {question}
Topic: {topic}
Reference Model Answer: {model_answer}
Candidate's Given Answer: "{candidate_answer}"

Evaluate the answer:
1. "is_correct": boolean (True if the candidate demonstrates fundamentally accurate and relevant understanding of the core concept. False if the answer is completely wrong, irrelevant, empty, or demonstrates fundamental misconception).
2. "score": float from 0.0 to 100.0 (Passing threshold is 60.0). CRITICAL: If candidate indicates they do not know, did not know, or have no idea, "score" MUST be 0.0 and "is_correct" MUST be false.
3. "feedback": string (1-2 sentences of specific, constructive feedback).
4. "model_answer": string (concise reference answer).

Output strictly valid JSON:
{{
  "is_correct": true,
  "score": 85.0,
  "feedback": "...",
  "model_answer": "..."
}}
"""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                is_correct = bool(parsed.get("is_correct", False))
                score = float(parsed.get("score", 50.0))
                # Ensure is_correct aligns with score threshold
                if score >= 60.0 and not is_correct:
                    is_correct = True
                elif score < 45.0 and is_correct:
                    is_correct = False

                feedback = parsed.get("feedback", "Good explanation.")
                refined_model = parsed.get("model_answer", model_answer)
                return (is_correct, score, feedback, refined_model)
    except Exception as e:
        logger.warning(f"Gemini answer evaluation error, using resilient offline evaluator: {e}")

    return _evaluate_answer_offline(question, candidate_answer, model_answer, topic)


def generate_summary_report(assessment: AdaptiveAssessment) -> Dict[str, Any]:
    """
    Synthesizes comprehensive final summary report across all rounds and questions attempted.
    """
    total_q = assessment.total_questions_asked
    total_corr = assessment.total_correct
    accuracy = round((total_corr / total_q * 100.0), 1) if total_q > 0 else 0.0

    # Categorize performance tier
    if assessment.termination_reason and ("proctoring" in assessment.termination_reason.lower() or "tab switch" in assessment.termination_reason.lower()):
        verdict = "Session Flagged & Terminated — Proctoring Violation (Exceeded Tab Switch Limit)"
        tier = "Flagged / Disqualified (Integrity Violation)"
    elif assessment.status == AssessmentStatus.TERMINATED_EARLY.value:
        verdict = f"Session Terminated in Round {assessment.current_round} (Passing threshold not met)"
        tier = "Developing (Needs Focused Review)"
    elif total_q >= 20:
        if accuracy >= 80.0:
            verdict = "Interview Completed — Distinction"
            tier = "Advanced / Expert"
        elif accuracy >= 60.0:
            verdict = "Interview Completed — Proficient"
            tier = "Proficient / Ready"
        else:
            verdict = "Interview Completed — Meets Basic Requirements"
            tier = "Intermediate"
    else:
        verdict = f"Interview Concluded ({total_corr}/{total_q} Correct)"
        tier = "Competent"

    # Compile questions list & topics
    topic_scores: Dict[str, List[float]] = {}
    strengths: List[str] = []
    weaknesses: List[str] = []

    for r in assessment.rounds_data:
        for q in r.get("questions", []):
            topic = q.get("topic", "General")
            raw_s = q.get("score")
            score = float(raw_s) if raw_s is not None else (80.0 if q.get("is_correct") else 0.0)
            topic_scores.setdefault(topic, []).append(score)

            if q.get("is_correct"):
                if len(strengths) < 4:
                    strengths.append(f"Demonstrated competence in {topic} ({q.get('question', '')[:60]}...)")
            else:
                if len(weaknesses) < 4:
                    weaknesses.append(f"Requires deeper mastery of {topic} principles and edge-case handling.")

    if assessment.termination_reason and ("proctoring" in assessment.termination_reason.lower() or "tab switch" in assessment.termination_reason.lower()):
        weaknesses.insert(0, "Candidate session was flagged: multiple unauthorized browser tab switches were detected during live interview.")

    if not strengths:
        strengths.append(f"Participated actively in the {assessment.job_category} assessment.")
    if not weaknesses:
        weaknesses.append("Continue practicing high-complexity system design and advanced optimization techniques.")

    topic_breakdown: Dict[str, float] = {
        top: round(sum(scores) / len(scores), 1) for top, scores in topic_scores.items()
    }

    narrative = (
        f"Candidate attempted {total_q} questions across {assessment.current_round} adaptive round(s) "
        f"for the {assessment.job_category} ({assessment.interview_level}) role. "
        f"Achieved {total_corr} correct answers with an overall accuracy of {accuracy}%. "
        f"{'Successfully qualified through all progressive adaptive rounds.' if assessment.status == AssessmentStatus.COMPLETED.value else 'Session closed early after failing the minimum correct answer criteria for the current round.'}"
    )

    recommendations = [
        f"Review core fundamentals in topics scored below 60%: {', '.join([t for t, s in topic_breakdown.items() if s < 60.0]) or 'All topics passed foundational baseline'}.",
        f"Practice articulating production architectural trade-offs for {assessment.interview_level} expectations.",
        "Take regular mock practice sessions to build confidence in concise technical explanations.",
    ]

    return {
        "verdict": verdict,
        "total_questions": total_q,
        "total_correct": total_corr,
        "accuracy_percentage": accuracy,
        "performance_tier": tier,
        "summary_narrative": narrative,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations,
        "topic_breakdown": topic_breakdown,
        "termination_reason": assessment.termination_reason,
    }


async def process_candidate_answer(
    assessment: AdaptiveAssessment,
    question_index: int,
    candidate_answer: str,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main state machine for adaptive question progression:
    1. Evaluates candidate's answer.
    2. Updates question in `rounds_data`.
    3. Evaluates round completion & adaptive rules:
       - Round 1 (5 questions): If 0 correct -> TERMINATED_EARLY. If >= 1 -> unlock Round 2 (2 questions).
       - Subsequent Rounds (2 questions each): If 0 correct -> TERMINATED_EARLY. If >= 1 -> unlock next round.
       - Max 20 questions total.
    """
    # Locate current round and question
    target_round: Optional[Dict[str, Any]] = None
    target_q: Optional[Dict[str, Any]] = None

    for r in assessment.rounds_data:
        for q in r.get("questions", []):
            if q.get("index") == question_index:
                target_round = r
                target_q = q
                break
        if target_q:
            break

    if not target_q or not target_round:
        raise ValueError(f"Question with index {question_index} not found in assessment {assessment.id}.")

    # Evaluate answer
    is_corr, score, feedback, model_ans = await evaluate_candidate_answer(
        question=target_q["question"],
        topic=target_q.get("topic", assessment.job_category),
        candidate_answer=candidate_answer,
        model_answer=target_q.get("model_answer", ""),
        job_category=assessment.job_category,
        interview_level=assessment.interview_level,
        api_key=api_key,
    )

    # Update question record
    target_q["candidate_answer"] = candidate_answer
    target_q["is_correct"] = is_corr
    target_q["score"] = score
    target_q["feedback"] = feedback
    target_q["model_answer"] = model_ans

    if is_corr:
        assessment.total_correct += 1

    # Check if all questions in this round have been answered
    round_questions = target_round.get("questions", [])
    all_answered = all(q.get("candidate_answer") is not None for q in round_questions)

    round_completed = all_answered
    round_passed: Optional[bool] = None
    next_question: Optional[Dict[str, Any]] = None

    if all_answered:
        target_round["is_completed"] = True
        correct_in_round = sum(1 for q in round_questions if q.get("is_correct"))
        target_round["correct_count"] = correct_in_round
        round_passed = correct_in_round >= 1
        target_round["passed"] = round_passed

        # Rule evaluation:
        if not round_passed:
            # 5a tar aktaw na answer thk na hole / subsequent 2 tar aktaw na hole: close live session!
            assessment.status = AssessmentStatus.TERMINATED_EARLY.value
            assessment.termination_reason = (
                f"Session terminated early: 0 out of {len(round_questions)} questions answered correctly in Round {target_round.get('round_number', 1)}."
            )
            assessment.completed_at = datetime.now(timezone.utc)
            assessment.summary_report = generate_summary_report(assessment)
        else:
            # Round passed! Check max 20 questions limit
            if assessment.total_questions_asked >= 20:
                assessment.status = AssessmentStatus.COMPLETED.value
                assessment.completed_at = datetime.now(timezone.utc)
                assessment.summary_report = generate_summary_report(assessment)
            else:
                # Calculate next questions count (usually 2, capped at 20)
                remaining = 20 - assessment.total_questions_asked
                next_count = min(2, remaining)
                next_round_num = assessment.current_round + 1
                next_start_idx = assessment.total_questions_asked + 1

                new_questions = await generate_round_questions(
                    job_category=assessment.job_category,
                    interview_level=assessment.interview_level,
                    cv_text=assessment.cv_text_summary,
                    round_number=next_round_num,
                    start_index=next_start_idx,
                    count=next_count,
                    api_key=api_key,
                )

                new_round_data = {
                    "round_number": next_round_num,
                    "questions_count": next_count,
                    "min_required_correct": 1,
                    "correct_count": 0,
                    "is_completed": False,
                    "passed": None,
                    "questions": new_questions,
                }
                assessment.rounds_data.append(new_round_data)
                assessment.current_round = next_round_num
                assessment.current_question_index = next_start_idx
                assessment.total_questions_asked += next_count
                next_question = new_questions[0]
    else:
        # Move to the next question within the current round
        assessment.current_question_index = question_index + 1
        for q in round_questions:
            if q.get("index") == assessment.current_question_index:
                next_question = q
                break

    return {
        "question_index": question_index,
        "is_correct": is_corr,
        "score": score,
        "feedback": feedback,
        "model_answer": model_ans,
        "round_completed": round_completed,
        "round_passed": round_passed,
        "session_status": assessment.status,
        "termination_reason": assessment.termination_reason,
        "next_question": next_question,
        "summary_report": assessment.summary_report,
    }

