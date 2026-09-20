"""Gemini AI service — powered by modern google-genai SDK with Gemini 3.1 Flash-Lite."""
import json
import re
from typing import Optional, List, Dict
from google import genai
from app.config import settings

MODEL_FLASH_LITE = "gemini-3.1-flash-lite"


def get_genai_client() -> genai.Client:
    """Retrieve initialized GenAI Client."""
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        raise RuntimeError(
            "Gemini API key is not configured. Please set a valid GEMINI_API_KEY in backend/.env."
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _extract_json(text: str):
    """Clean and parse JSON from response text with robust fallback handling."""
    clean_text = text.strip()
    if clean_text.startswith("```"):
        clean_text = re.sub(r"^```[a-zA-Z]*\n", "", clean_text)
        clean_text = re.sub(r"```$", "", clean_text).strip()

    try:
        return json.loads(clean_text, strict=False)
    except json.JSONDecodeError:
        pass

    array_match = re.search(r"\[.*\]", clean_text, re.DOTALL)
    if array_match:
        try:
            return json.loads(array_match.group(), strict=False)
        except json.JSONDecodeError:
            pass

    object_match = re.search(r"\{.*\}", clean_text, re.DOTALL)
    if object_match:
        try:
            return json.loads(object_match.group(), strict=False)
        except json.JSONDecodeError:
            pass

    # Robust attempt to repair partially truncated JSON
    trimmed = clean_text.rstrip()
    for suffix in ['"}', '"]}', '}]}', '"}]}', '"]}}', '"]}]}', ']}', '}']:
        try:
            return json.loads(trimmed + suffix, strict=False)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Unable to extract valid JSON from response: {text[:200]}")


async def generate_questions(
    career_goal: str,
    current_level: str,
    topics: List[str],
    count: int = 10
) -> List[dict]:
    """Dynamically generate skill assessment questions using Gemini 3.1 Flash-Lite."""
    client = get_genai_client()
    topics_desc = ', '.join(topics) if topics else f'Key core competencies, industry standards, tools, and real-world scenarios required for a {career_goal}'
    prompt = f"""You are an expert technical interviewer and educator.
Generate {count} comprehensive multiple-choice assessment questions dynamically tailored for:
- Target Career Goal / Role: {career_goal}
- Target Skill Level: {current_level}
- Focus Topics / Technologies: {topics_desc}

Requirements:
- Questions must be 100% dynamic and specifically relevant to {career_goal}. Do NOT use generic or static fallback questions.
- Topic tags must be specific and accurate to the exact technology or domain tested (e.g. if Web Development: React, CSS, REST APIs; if DevOps: Docker, Kubernetes, CI/CD; if Data Science: Data Wrangling, Model Evaluation, Feature Engineering; etc.).
- Align difficulty to '{current_level}':
  * beginner: fundamental concepts, core syntax, principles, and terminology.
  * intermediate: practical problem-solving, architectural choices, debugging, real-world patterns.
  * advanced: system design, optimization, edge cases, scalability, security.
- Provide 4 distinct, plausible options for each question with only ONE unambiguously correct answer.
- Provide a concise educational explanation for why the correct answer is right.

Output strict JSON array adhering to this schema:
[
  {{
    "id": "q1",
    "text": "Question text here?",
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Exact string of the correct option",
    "explanation": "Clear explanation of why this answer is correct",
    "topic_tag": "Specific Domain Topic",
    "difficulty": "{current_level}"
  }}
]"""

    response = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )
    data = _extract_json(response.text)
    if not isinstance(data, list) or len(data) == 0:
        raise ValueError("AI failed to generate a list of questions.")
    return data[:count]


async def analyze_skill_gap(
    career_goal: str,
    assessment_results: dict,
    current_skills: List[str],
) -> dict:
    """Analyze student skill gaps and benchmark against career goals dynamically."""
    client = get_genai_client()
    prompt = f"""Analyze the skill gap for a student aspiring to become a '{career_goal}'.

Student background:
- Declared skills: {', '.join(current_skills) if current_skills else 'None declared'}
- Assessment Results: {json.dumps(assessment_results, indent=2)}

Compute the student's mastery level (0-100) on each relevant skill and compare with the industry required level (0-100) for a '{career_goal}'.

Schema:
{{
  "strong_skills": ["Skill where student demonstrated high competence"],
  "weak_skills": ["Skill where student struggled or scored low"],
  "missing_skills": ["Critical skills for {career_goal} not yet covered"],
  "skill_levels": {{
    "Skill Name": 60
  }},
  "required_levels": {{
    "Skill Name": 85
  }},
  "recommendations": [
    "Actionable step 1",
    "Actionable step 2"
  ],
  "ai_summary": "A 2-3 sentence personalized diagnostic summarizing their current standing and next focus area."
}}"""

    response = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )
    data = _extract_json(response.text)
    if not isinstance(data, dict):
        raise ValueError("AI failed to generate a skill gap analysis object.")
    return data


async def generate_learning_path(
    career_goal: str,
    current_skills: List[str],
    weak_skills: List[str],
    daily_minutes: int,
    learning_style: str,
) -> List[dict]:
    """
    Dynamically generate a personalized step-by-step learning roadmap outline.
    RULE: Never generate the whole course content or quizzes at once!
    Only generates the sequential topic syllabus: Topic 0 is 'available', all subsequent are 'locked'.
    """
    client = get_genai_client()
    prompt = f"""Generate a personalized learning path syllabus outline for a student aspiring to become a '{career_goal}'.

Student Profile:
- Current Skills: {', '.join(current_skills) if current_skills else 'Beginner'}
- Identified Weak / Gap Areas: {', '.join(weak_skills) if weak_skills else 'None identified'}
- Daily Study Commitment: {daily_minutes} minutes/day
- Preferred Learning Style: {learning_style}

Strict Generation Rules:
1. Provide 6 to 8 sequential topics organized strictly from foundational prerequisites to advanced mastery.
2. DO NOT generate quizzes or full reading content for these topics at this stage.
3. The FIRST topic must have "status": "available".
4. ALL subsequent topics MUST have "status": "locked".
5. Provide 2-3 essential learning resource links per topic (official docs, standard tutorials, textbooks).
6. Ensure estimated_hours reflect realistic time investment for each topic.

Schema:
[
  {{
    "topic_name": "Topic Title",
    "topic_description": "2-3 sentences explaining core concepts covered, prerequisites, and learning objectives.",
    "difficulty": "beginner|intermediate|advanced",
    "estimated_hours": 12,
    "status": "available",
    "order_index": 0,
    "resources_json": [
      {{
        "type": "docs|article|video|book|practice|project",
        "title": "Resource title",
        "url": "https://..."
      }}
    ]
  }}
]"""

    response = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )
    items = _extract_json(response.text)
    if not isinstance(items, list) or len(items) == 0:
        raise ValueError("AI failed to generate learning path outline.")

    for i, item in enumerate(items):
        item["order_index"] = i
        if i == 0:
            item["status"] = "available"
        else:
            item["status"] = "locked"
        # Ensure quiz is NOT generated ahead of time
        item.pop("quiz", None)

    return items


async def generate_topic_content(
    topic_name: str,
    difficulty: str = "intermediate",
    career_goal: str = "",
    learner_level: str = "beginner"
) -> dict:
    """
    Generate comprehensive, in-depth topic learning material.
    Includes all 16 required sections and clearly separated official/academic sources.
    """
    client = get_genai_client()
    prompt = f"""You are a distinguished university professor and senior technical specialist.
Generate exhaustive, deep learning content specifically for the topic: '{topic_name}'
Target Career Goal: '{career_goal or 'Software Engineer / Technologist'}'
Difficulty Level: '{difficulty}'
Learner Background: '{learner_level}'

CRITICAL INSTRUCTION:
Do NOT output a brief summary. Deliver a comprehensive, university-grade textbook chapter that thoroughly teaches the topic from first principles to advanced mastery.

You must cover all of the following:
1. Topic introduction
2. Detailed explanation
3. Important concepts
4. Sub-concepts
5. Definitions
6. Working principles and mechanics
7. Concrete examples (with code or mathematical/logical breakdown)
8. Real-world applications
9. Step-by-step explanation
10. Common mistakes & anti-patterns
11. Important points to remember
12. Practical examples / hands-on scenario
13. Exam & technical interview oriented points
14. Related concepts & future directions
15. Difficulty level
16. Sources & References: Real official documentation, canonical textbooks, university curricula, and research papers. Do NOT invent fake URLs or sources. Clearly separated.

Output strict JSON adhering to this exact schema:
{{
  "topic_name": "{topic_name}",
  "difficulty": "{difficulty}",
  "topic_introduction": "Engaging, thorough introduction explaining what {topic_name} is, why it matters, and its core intuition.",
  "detailed_explanation": "In-depth, multi-paragraph conceptual explanation breaking down the subject completely.",
  "important_concepts": [
    {{ "title": "Concept Name", "explanation": "Deep explanation of this concept." }}
  ],
  "sub_concepts": [
    {{ "title": "Sub-concept Name", "details": "Detailed breakdown and nuances." }}
  ],
  "definitions": [
    {{ "term": "Term", "definition": "Clear, precise academic and industry definition." }}
  ],
  "working_principles": [
    {{ "principle": "Core Principle", "mechanism": "Step-by-step technical mechanics of how it operates." }}
  ],
  "examples": [
    {{
      "title": "Example Title",
      "code_or_snippet": "// Concrete code snippet, algorithm, or syntax demonstration",
      "explanation": "Walkthrough of how this example works line-by-line."
    }}
  ],
  "real_world_applications": [
    {{ "domain": "Industry / Domain", "application": "How this is deployed in production systems." }}
  ],
  "step_by_step_guide": [
    {{ "step_number": 1, "title": "Step Title", "detail": "Specific action or execution instruction." }}
  ],
  "common_mistakes": [
    {{
      "mistake": "Common misconception or trap",
      "why_it_happens": "Why developers/learners make this mistake",
      "correction": "How to avoid or fix it correctly"
    }}
  ],
  "important_points_to_remember": [
    "Crucial takeaway 1",
    "Crucial takeaway 2",
    "Crucial takeaway 3"
  ],
  "practical_examples": [
    {{
      "scenario": "Production / Practical Scenario",
      "solution": "Comprehensive practical solution and architecture"
    }}
  ],
  "exam_oriented_points": [
    "High-yield exam / technical interview question and expected answer key",
    "Edge case frequently tested in technical rounds"
  ],
  "related_concepts": [
    "Connected topic 1",
    "Connected topic 2"
  ],
  "sources_and_references": [
    {{
      "title": "Official Docs / Standard Textbook Name",
      "type": "Official Documentation|Standard Textbook|Academic Research|University Resource",
      "author_or_organization": "Author or Governing Body",
      "citation_note": "Edition, Chapter, or Official URL description",
      "url": "https://..."
    }}
  ]
}}"""

    response = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt,
        config={"response_mime_type": "application/json", "max_output_tokens": 8192},
    )
    content = _extract_json(response.text)
    if not isinstance(content, dict):
        raise ValueError(f"AI failed to generate comprehensive content for topic {topic_name}.")
    return content


def _format_study_material_context(content: dict) -> str:
    """Format key sections of study material into a clean reference string for quiz generation."""
    if not isinstance(content, dict):
        return ""

    sections = []
    if content.get("topic_introduction"):
        sections.append(f"### Introduction\n{content['topic_introduction']}")

    if content.get("definitions"):
        defs = [f"- **{d.get('term', '')}**: {d.get('definition', '')}" for d in content["definitions"] if isinstance(d, dict)]
        if defs:
            sections.append("### Key Definitions\n" + "\n".join(defs))

    if content.get("important_concepts"):
        conc = [f"- **{c.get('title', '')}**: {c.get('explanation', '')}" for c in content["important_concepts"] if isinstance(c, dict)]
        if conc:
            sections.append("### Important Concepts\n" + "\n".join(conc))

    if content.get("sub_concepts"):
        sub = [f"- **{s.get('title', '')}**: {s.get('details', '')}" for s in content["sub_concepts"] if isinstance(s, dict)]
        if sub:
            sections.append("### Sub-Concepts\n" + "\n".join(sub))

    if content.get("working_principles"):
        wp = [f"- **{p.get('principle', '')}**: {p.get('mechanism', '')}" for p in content["working_principles"] if isinstance(p, dict)]
        if wp:
            sections.append("### Working Principles & Mechanics\n" + "\n".join(wp))

    if content.get("examples"):
        exs = []
        for e in content["examples"]:
            if isinstance(e, dict):
                snip = e.get("code_or_snippet", "")
                exs.append(f"- **{e.get('title', '')}**:\n```\n{snip}\n```\nExplanation: {e.get('explanation', '')}")
        if exs:
            sections.append("### Examples & Code Snippets\n" + "\n".join(exs))

    if content.get("common_mistakes"):
        mistakes = []
        for m in content["common_mistakes"]:
            if isinstance(m, dict):
                mistakes.append(f"- **Mistake**: {m.get('mistake', '')}\n  Why: {m.get('why_it_happens', '')}\n  Correction: {m.get('correction', '')}")
        if mistakes:
            sections.append("### Common Mistakes & Pitfalls\n" + "\n".join(mistakes))

    if content.get("important_points_to_remember"):
        pts = [f"- {p}" for p in content["important_points_to_remember"] if isinstance(p, str)]
        if pts:
            sections.append("### Important Takeaways\n" + "\n".join(pts))

    if content.get("exam_oriented_points"):
        eps = [f"- {ep}" for ep in content["exam_oriented_points"] if isinstance(ep, str)]
        if eps:
            sections.append("### Exam & High-Yield Points\n" + "\n".join(eps))

    return "\n\n".join(sections)


async def generate_quiz_from_study_material(
    topic_name: str,
    difficulty: str = "intermediate",
    study_material: Optional[dict] = None,
    count: int = 30,
) -> List[dict]:
    """
    Generate diagnostic quiz questions STRICTLY ACCORDING TO the provided study material.
    Every question tests concepts, definitions, working principles, examples, edge cases,
    and common mistakes explicitly detailed in the study material.
    """
    client = get_genai_client()
    context_str = _format_study_material_context(study_material) if study_material else f"Core principles, definitions, syntax, and examples of {topic_name}"

    if count < 20:
        prompt = f"""You are an expert technical examiner.
CRITICAL INSTRUCTION: Generate {count} diagnostic quiz questions STRICTLY AND DIRECTLY ACCORDING TO the following study material provided to the student.
Every question must evaluate specific concepts, definitions, mechanics, code examples, or common mistakes explicitly covered in this study material. Do not test external or unmentioned topics.

STUDY MATERIAL:
{context_str}

Difficulty: '{difficulty}'

Requirements:
- Questions must be 100% aligned with and answerable from the study material above.
- Question types to use: 'mcq', 'scenario', 'application'.
- Every question MUST include:
  1. Clear question text
  2. 4 plausible options
  3. The exact correct answer
  4. Detailed explanation: Explain WHY the correct answer is correct based on the study material, and why others are incorrect.
  5. Concept tag: specific concept/section tested from the study material
  6. Hint: A conceptual guiding hint
  7. Difficulty: '{difficulty}'

Schema:
[
  {{
    "id": "q1",
    "text": "Question text directly evaluating study material?",
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Option A is correct according to the study material because... Option B is incorrect because...",
    "concept_tag": "Concept from Study Material",
    "difficulty": "{difficulty}",
    "hint": "Think about..."
  }}
]"""
        response = client.models.generate_content(
            model=MODEL_FLASH_LITE,
            contents=prompt,
            config={"response_mime_type": "application/json", "max_output_tokens": 8192},
        )
        questions = _extract_json(response.text)
        if not isinstance(questions, list):
            questions = []
        for idx, q in enumerate(questions):
            q["id"] = f"q{idx + 1}"
            q["order_index"] = idx
            if not q.get("concept_tag"):
                q["concept_tag"] = f"{topic_name} Core"
            if not q.get("difficulty"):
                q["difficulty"] = difficulty
        return questions

    # For 30 questions: Batch 1 (Foundations, Definitions, Principles, Misconceptions from material)
    prompt_batch_1 = f"""You are an expert technical examiner.
CRITICAL INSTRUCTION: Generate 15 diagnostic quiz questions (Questions 1 to 15 of 30) STRICTLY ACCORDING TO the following study material.
Every question must test specific definitions, concepts, working principles, or common mistakes taught in this material.

STUDY MATERIAL:
{context_str}

Focus Areas:
- Key Definitions & Core Terminology from the material (4 questions)
- Working Principles & Internal Mechanics explained in the material (4 questions)
- Common Mistakes, Pitfalls & Misconceptions highlighted in the material (4 questions)
- Core Concepts & Nuances from the material (3 questions)

Requirements:
- Questions must be rigorous and test deep understanding of the provided study material.
- Types: 'mcq' (single choice), 'multiple_choice', 'true_false'.
- Include: id, text, type, options, correct_answer, explanation (explaining why correct and why distractors fail based on the material), concept_tag (from material), hint, difficulty ('beginner' or 'intermediate').

Schema:
[
  {{
    "id": "q1",
    "text": "Question text based directly on study material?",
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "According to the study material, Option A is correct because...",
    "concept_tag": "Section or Concept from Material",
    "difficulty": "beginner|intermediate",
    "hint": "Refer to the definition / principle..."
  }}
]"""

    prompt_batch_2 = f"""You are an expert technical examiner.
CRITICAL INSTRUCTION: Generate 15 advanced diagnostic quiz questions (Questions 16 to 30 of 30) STRICTLY ACCORDING TO the following study material.
Focus on code examples, practical scenarios, real-world applications, and high-yield exam points covered in this material.

STUDY MATERIAL:
{context_str}

Focus Areas:
- Code Examples & Practical Demonstrations from the material (4 questions)
- Real-World Production Applications & Scenarios from the material (4 questions)
- Exam-Oriented Points & High-Yield Traps from the material (4 questions)
- Edge Cases & Nuance Analysis from the material (3 questions)

Requirements:
- Questions must reference or derive directly from the scenarios, code examples, or edge cases in the study material.
- Types: 'scenario', 'application', 'mcq'.
- Include: id, text, type, options, correct_answer, explanation, concept_tag, hint, difficulty ('intermediate' or 'advanced').

Schema:
[
  {{
    "id": "q16",
    "text": "Scenario/Code question evaluating study material?",
    "type": "scenario",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "According to the examples in the study material, Option A is correct because...",
    "concept_tag": "Practical Concept from Material",
    "difficulty": "intermediate|advanced",
    "hint": "Recall the code example / scenario..."
  }}
]"""

    response_1 = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt_batch_1,
        config={"response_mime_type": "application/json", "max_output_tokens": 8192},
    )
    batch_1 = _extract_json(response_1.text)
    if not isinstance(batch_1, list):
        batch_1 = []

    response_2 = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt_batch_2,
        config={"response_mime_type": "application/json", "max_output_tokens": 8192},
    )
    batch_2 = _extract_json(response_2.text)
    if not isinstance(batch_2, list):
        batch_2 = []

    combined = batch_1 + batch_2
    for idx, q in enumerate(combined):
        q["id"] = f"q{idx + 1}"
        q["order_index"] = idx
        if not q.get("concept_tag"):
            q["concept_tag"] = f"{topic_name} Core"
        if not q.get("difficulty"):
            q["difficulty"] = "intermediate"

    if len(combined) < 30:
        missing = 30 - len(combined)
        extra_prompt = f"""Generate {missing} additional quiz questions STRICTLY ACCORDING TO this study material for '{topic_name}'.
STUDY MATERIAL SUMMARY:
{context_str[:2000]}
Schema: list of objects with id, text, type, options, correct_answer, explanation, concept_tag, difficulty, hint."""
        try:
            extra_res = client.models.generate_content(
                model=MODEL_FLASH_LITE,
                contents=extra_prompt,
                config={"response_mime_type": "application/json"},
            )
            extra_qs = _extract_json(extra_res.text)
            if isinstance(extra_qs, list):
                for q in extra_qs:
                    q["id"] = f"q{len(combined) + 1}"
                    q["order_index"] = len(combined)
                    combined.append(q)
        except Exception:
            pass

    return combined


async def generate_topic_content_and_quiz(
    topic_name: str,
    difficulty: str = "intermediate",
    career_goal: str = "",
    learner_level: str = "beginner",
    quiz_count: int = 30,
) -> tuple[dict, List[dict]]:
    """
    Generate university-grade study material and diagnostic quiz AT THE SAME TIME.
    The quiz is generated strictly according to the generated study material.
    """
    content = await generate_topic_content(
        topic_name=topic_name,
        difficulty=difficulty,
        career_goal=career_goal,
        learner_level=learner_level,
    )

    quiz_questions = await generate_quiz_from_study_material(
        topic_name=topic_name,
        difficulty=difficulty,
        study_material=content,
        count=quiz_count,
    )

    return content, quiz_questions


async def generate_topic_quiz_30(
    topic_name: str,
    difficulty: str = "intermediate",
    concepts_list: Optional[List[str]] = None,
    study_material: Optional[dict] = None,
) -> List[dict]:
    """
    Generate at least 30 comprehensive, high-quality quiz questions specifically for this topic.
    If study_material is provided, delegates to generate_quiz_from_study_material so questions
    strictly match the study material.
    """
    if study_material:
        return await generate_quiz_from_study_material(topic_name, difficulty, study_material, count=30)

    client = get_genai_client()
    concepts_str = ", ".join(concepts_list) if concepts_list else f"Core mechanics, syntax, architecture, principles, complexity, edge cases, and best practices of {topic_name}"

    # Batch 1: Questions 1 to 15 (Foundations, Concepts, Definitions, Mechanics, Misconceptions)
    prompt_batch_1 = f"""Generate 15 diagnostic quiz questions (Questions 1 to 15 of 30) on the topic: '{topic_name}' at difficulty level: '{difficulty}'.
Focus Areas:
- Basic Understanding & Definitions (4 questions)
- Conceptual Understanding & Internal Mechanics (4 questions)
- Common Misconceptions & Pitfalls (4 questions)
- Reasoning & Principles (3 questions)

Requirements:
- Questions must be rigorous and test deep understanding, not surface memorization.
- Question types to use: 'mcq' (single choice), 'multiple_choice' (multiple correct), 'true_false'.
- Every question MUST include:
  1. Clear question text
  2. 4 plausible options (or 2 for true/false)
  3. The exact correct answer
  4. Detailed explanation: Explain WHY the correct answer is correct AND why other choices are incorrect.
  5. Concept tag: specific sub-concept tested (e.g., '{topic_name} Principle', 'Time Complexity', 'Syntax & Types', 'Edge Cases')
  6. Hint: A conceptual guiding hint without giving away the direct answer
  7. Difficulty: 'beginner' or 'intermediate'

Schema:
[
  {{
    "id": "q1",
    "text": "Question text?",
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Option A is correct because... Option B is incorrect because... Option C fails because...",
    "concept_tag": "Specific Sub-concept",
    "difficulty": "beginner|intermediate",
    "hint": "Think about how..."
  }}
]"""

    # Batch 2: Questions 16 to 30 (Applications, Scenarios, Real-World, Exam-Oriented, High Difficulty)
    prompt_batch_2 = f"""Generate 15 advanced diagnostic quiz questions (Questions 16 to 30 of 30) on the topic: '{topic_name}' at difficulty level: '{difficulty}'.
Focus Areas:
- Real-World Application-Based Questions (4 questions)
- Complex Scenario & Debugging Questions (4 questions)
- Exam & Technical Interview High-Yield Questions (4 questions)
- Higher-Difficulty & Edge Case Analysis (3 questions)

Requirements:
- Include practical code snippets or scenario descriptions where appropriate.
- Question types to use: 'scenario', 'application', 'mcq'.
- Every question MUST include:
  1. Clear question text / scenario
  2. 4 plausible options
  3. The exact correct answer
  4. Detailed explanation: Explain WHY the correct answer is correct AND why other choices are incorrect.
  5. Concept tag: specific sub-concept tested (e.g., 'Performance Optimization', 'Error Handling', 'Production Scalability', 'Edge Case Handling')
  6. Hint: A conceptual guiding hint
  7. Difficulty: 'intermediate' or 'advanced'

Schema:
[
  {{
    "id": "q16",
    "text": "Scenario / Application question text?",
    "type": "scenario",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Option A is correct because... Option B is incorrect because...",
    "concept_tag": "Specific Advanced Sub-concept",
    "difficulty": "intermediate|advanced",
    "hint": "Consider the edge case where..."
  }}
]"""

    response_1 = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt_batch_1,
        config={"response_mime_type": "application/json", "max_output_tokens": 8192},
    )
    batch_1 = _extract_json(response_1.text)
    if not isinstance(batch_1, list):
        batch_1 = []

    response_2 = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt_batch_2,
        config={"response_mime_type": "application/json", "max_output_tokens": 8192},
    )
    batch_2 = _extract_json(response_2.text)
    if not isinstance(batch_2, list):
        batch_2 = []

    combined = batch_1 + batch_2

    # Normalize IDs and order
    for idx, q in enumerate(combined):
        q["id"] = f"q{idx + 1}"
        q["order_index"] = idx
        if not q.get("concept_tag"):
            q["concept_tag"] = f"{topic_name} Core"
        if not q.get("difficulty"):
            q["difficulty"] = "intermediate"

    if len(combined) < 30:
        # If slightly under 30 due to model response size, fill remaining up to 30
        missing = 30 - len(combined)
        extra_prompt = f"""Generate {missing} additional diverse quiz questions on '{topic_name}' with fields id, text, type, options, correct_answer, explanation, concept_tag, difficulty, hint."""
        try:
            extra_res = client.models.generate_content(
                model=MODEL_FLASH_LITE,
                contents=extra_prompt,
                config={"response_mime_type": "application/json"},
            )
            extra_qs = _extract_json(extra_res.text)
            if isinstance(extra_qs, list):
                for q in extra_qs:
                    q["id"] = f"q{len(combined) + 1}"
                    q["order_index"] = len(combined)
                    combined.append(q)
        except Exception:
            pass

    return combined


async def generate_remedial_content(
    topic_name: str,
    weak_concepts: List[str],
    misconceptions: List[str],
    quiz_score: float
) -> dict:
    """
    Generate targeted remedial explanations and practice questions when learner scores < 70%.
    Focuses specifically on resolving identified weak concepts and misconceptions.
    """
    client = get_genai_client()
    weak_str = ", ".join(weak_concepts) if weak_concepts else f"General fundamentals of {topic_name}"
    misconceptions_str = "; ".join(misconceptions) if misconceptions else "Common beginner pitfalls and edge cases"

    prompt = f"""You are a master adaptive tutor. A student just attempted the 30-question diagnostic quiz on '{topic_name}' and scored {round(quiz_score)}%, which is below the 70% mastery threshold.

Diagnostic Analysis:
- Weak Sub-concepts Identified: {weak_str}
- Diagnosed Misconceptions / Errors: {misconceptions_str}

Provide a targeted remedial learning package to help them master these exact weak areas before retaking the quiz:
1. An encouraging, analytical diagnostic summary.
2. Targeted conceptual re-explanations for each weak sub-concept.
3. 3-4 targeted remedial practice questions with instant detailed explanations to reinforce understanding.

Output strict JSON adhering to this schema:
{{
  "remedial_summary": "Empathetic, clear diagnostic explaining what needs review and how to improve.",
  "concept_breakdowns": [
    {{
      "concept": "Name of Weak Concept",
      "why_difficult": "Why this is commonly tricky",
      "core_explanation": "Crystal-clear re-explanation addressing the misconception directly",
      "rule_of_thumb": "Practical memory aid or principle to always follow"
    }}
  ],
  "practice_questions": [
    {{
      "question": "Targeted practice question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Why this option is correct and reinforces the core concept."
    }}
  ]
}}"""

    response = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )
    data = _extract_json(response.text)
    if not isinstance(data, dict):
        raise ValueError("AI failed to generate remedial learning content.")
    return data


async def generate_quiz(topic: str, difficulty: str = "intermediate", count: int = 30) -> List[dict]:
    """Compatibility wrapper for quiz generation."""
    if count >= 20:
        return await generate_topic_quiz_30(topic, difficulty)
    client = get_genai_client()
    prompt = f"""Generate {count} quiz questions specifically on the topic: '{topic}' at '{difficulty}' difficulty level.
Schema:
[
  {{
    "id": "q1",
    "text": "Question text testing practical knowledge of {topic}?",
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Exact text of Option A",
    "explanation": "Detailed explanation of why this option is correct and others incorrect",
    "topic_tag": "{topic}",
    "concept_tag": "{topic} Fundamentals",
    "hint": "Consider the core principle",
    "difficulty": "{difficulty}"
  }}
]"""
    response = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )
    data = _extract_json(response.text)
    if not isinstance(data, list) or len(data) == 0:
        raise ValueError(f"AI failed to generate quiz for topic {topic}.")
    return data[:count]


async def chat_with_tutor(
    message: str,
    student_context: dict,
    chat_history: List[dict] = None
) -> str:
    """AI tutor chat using student's actual learning path and assessment context."""
    client = get_genai_client()

    context_str = f"""
Student Context:
- Name: {student_context.get('name', 'Student')}
- Career Goal: {student_context.get('career_goal', 'Learner')}
- Current Topic: {student_context.get('current_topic', 'Not started')}
- Overall Progress: {student_context.get('overall_progress', 0)}%
- Completed Topics: {', '.join(student_context.get('completed_topics', [])) or 'None yet'}
- Weak Areas: {', '.join(student_context.get('weak_skills', [])) or 'None identified'}
- Learning Style: {student_context.get('learning_style', 'mixed')}
"""

    system_instruction = f"""You are the student's personal AI Learning Tutor for Smart Learning Path.
{context_str}

Guidelines:
- Answer the student's questions accurately, encouragingly, and clearly.
- Ground explanations in their actual learning path and career goal ({student_context.get('career_goal', 'Learner')}).
- Use markdown formatting with code examples when explaining technical concepts.
- Keep answers educational, supportive, and concise."""

    chat = client.chats.create(
        model=MODEL_FLASH_LITE,
        config={"system_instruction": system_instruction},
    )

    if chat_history:
        for msg in chat_history[-6:]:
            chat.send_message(msg["content"])

    response = chat.send_message(message)
    return response.text


async def generate_recommendations(student_context: dict) -> List[dict]:
    """Dynamically generate AI recommendations based on user's actual progress."""
    client = get_genai_client()
    prompt = f"""Generate 3 to 4 timely and actionable recommendations for this student:
{json.dumps(student_context, indent=2)}

Recommendations should focus on the student's next step, addressing weak areas, or suggesting relevant hands-on projects/practices.

Schema:
[
  {{
    "type": "topic|resource|project|course",
    "title": "Title of recommendation",
    "description": "Short explanation of what to do",
    "reason": "Direct reference to student's goal, assessment, or progress",
    "priority": 1
  }}
]"""

    response = client.models.generate_content(
        model=MODEL_FLASH_LITE,
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )
    data = _extract_json(response.text)
    if not isinstance(data, list):
        raise ValueError("AI failed to generate recommendations array.")
    return data
