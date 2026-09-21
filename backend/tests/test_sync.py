"""Test simultaneous study material and quiz generation."""
import asyncio
from unittest.mock import AsyncMock, patch

from app.services.gemini_service import (
    _format_study_material_context,
    generate_topic_content_and_quiz,
)

SAMPLE_STUDY_MATERIAL = {
    "topic_name": "Python Generators",
    "difficulty": "intermediate",
    "topic_introduction": "Generators allow you to declare a function that behaves like an iterator.",
    "definitions": [
        {"term": "yield", "definition": "A keyword in Python that returns a generator object instead of terminating."}
    ],
    "important_concepts": [
        {"title": "Lazy Evaluation", "explanation": "Values are computed only when requested."}
    ],
    "sub_concepts": [
        {"title": "Generator Expressions", "details": "Syntax similar to list comprehensions but with parentheses."}
    ],
    "working_principles": [
        {"principle": "State Preservation", "mechanism": "The local state and execution pointer are saved across yields."}
    ],
    "examples": [
        {
            "title": "Simple Counter",
            "code_or_snippet": "def count_up():\n    yield 1\n    yield 2",
            "explanation": "Yields 1 then 2 successively."
        }
    ],
    "common_mistakes": [
        {
            "mistake": "Calling next() past StopIteration",
            "why_it_happens": "Forgetting that generators exhaust.",
            "correction": "Catch StopIteration or use a for loop."
        }
    ],
    "important_points_to_remember": [
        "Generators save substantial memory compared to lists."
    ],
    "exam_oriented_points": [
        "Difference between return and yield in bytecode and execution flow."
    ],
}


def test_format_study_material_context():
    """Verify that _format_study_material_context faithfully extracts all sections."""
    formatted = _format_study_material_context(SAMPLE_STUDY_MATERIAL)
    assert "### Introduction" in formatted
    assert "### Key Definitions" in formatted
    assert "yield" in formatted
    assert "### Important Concepts" in formatted
    assert "Lazy Evaluation" in formatted
    assert "### Working Principles & Mechanics" in formatted
    assert "State Preservation" in formatted
    assert "### Examples & Code Snippets" in formatted
    assert "def count_up():" in formatted
    assert "### Common Mistakes & Pitfalls" in formatted
    assert "Calling next() past StopIteration" in formatted
    assert "### Important Takeaways" in formatted
    assert "Generators save substantial memory" in formatted
    assert "### Exam & High-Yield Points" in formatted


def test_generate_topic_content_and_quiz_simultaneous():
    """Verify that generate_topic_content_and_quiz executes both and passes content to quiz."""
    mock_questions = [
        {
            "id": "q1",
            "text": "What does the yield keyword do?",
            "type": "mcq",
            "options": ["Pauses and returns", "Exits function", "Raises error", "Allocates memory"],
            "correct_answer": "Pauses and returns",
            "explanation": "Yield pauses function execution and saves state.",
            "concept_tag": "State Preservation",
            "difficulty": "intermediate",
            "hint": "Think about lazy evaluation.",
        }
    ]

    async def run():
        with patch("app.services.gemini_service.generate_topic_content", new_callable=AsyncMock) as mock_content, \
             patch("app.services.gemini_service.generate_quiz_from_study_material", new_callable=AsyncMock) as mock_quiz:

            mock_content.return_value = SAMPLE_STUDY_MATERIAL
            mock_quiz.return_value = mock_questions

            content, quiz = await generate_topic_content_and_quiz(
                topic_name="Python Generators",
                difficulty="intermediate",
                career_goal="Backend Engineer",
                learner_level="intermediate",
                quiz_count=30,
            )

            mock_content.assert_called_once_with(
                topic_name="Python Generators",
                difficulty="intermediate",
                career_goal="Backend Engineer",
                learner_level="intermediate",
            )

            mock_quiz.assert_called_once_with(
                topic_name="Python Generators",
                difficulty="intermediate",
                study_material=SAMPLE_STUDY_MATERIAL,
                count=30,
            )

            assert content == SAMPLE_STUDY_MATERIAL
            assert quiz == mock_questions
            assert quiz[0]["concept_tag"] == "State Preservation"

    asyncio.run(run())
