# Wildcard routes (dynamic URL segments)

Use **wildcard routes** so one page can serve many URLs with dynamic segments—for example a single “guided course” page that works for every course and module: `/app/guided-courses/foundations/module-1`, `/app/guided-courses/advanced/lesson-5`, and so on.

---

## How it works

- You create **one page** whose URL pattern includes placeholders like `{course}` and `{module}`.
- When a visitor opens a URL that matches that pattern, they see that page, and the segments from the URL are available in the template as **`route_params`** (and as **`route_slug`**).
- You can have **multiple** such pages with different patterns (e.g. one for courses, one for workshops).

Placeholders use **curly braces** so they’re safe in filenames and easy to read: `{course}`, `{module}`, `{id}`, etc.

---

## Setting up a wildcard route

### 1. Create the page

In the app, create a page that will handle all URLs under a path, for example:

- **Path/slug pattern:** `app/guided-courses/{course}/{module}`

So:

- The **fixed part** is: `app/guided-courses`
- The **dynamic parts** are: `{course}` and `{module}`

Use the exact pattern (including the placeholders) as the page’s **slug** in the app. The number of placeholders must match the number of segments after the fixed part (e.g. two placeholders → two segments).

### 2. What URLs will match

Once that page exists, URLs like these will all show the **same** page, with different segment values:

| URL | `route_params.course` | `route_params.module` |
|-----|------------------------|------------------------|
| `/app/guided-courses/foundations/module-1` | `foundations` | `module-1` |
| `/app/guided-courses/advanced/lesson-5`    | `advanced`    | `lesson-5` |
| `/app/guided-courses/intro/welcome`        | `intro`       | `welcome`  |

The **exact** URL `/app/guided-courses` (no extra segments) also matches this page; in that case there are no dynamic segments, so `route_params` will be empty/null as appropriate.

---

## Using the segments in your template

Two things are available in the template:

- **`route_params`** – Object with one key per placeholder, e.g. `{ course: 'foundations', module: 'module-1' }`. Use this when you named your placeholders (e.g. `{course}`, `{module}`).
- **`route_slug`** – The full “rest of the path” as one string, e.g. `foundations/module-1`. Useful when you have a single placeholder or want the whole tail.

### Displaying the current segment

```html
<p>Course: {{ route_params.course }}</p>
<p>Module: {{ route_params.module }}</p>
```

### Using the course slug in a template function

For a guided-course page you often want to load the course by the slug from the URL:

```html
@set(course = getCourseBySlug(route_params.course))
@if(course)
  <h1>{{ course.title }}</h1>
  ...
@endif
```

You **must** pass the slug explicitly (e.g. `route_params.course`); `getCourseBySlug` does not read the URL by itself.

### Single dynamic segment

If your page slug is something like `app/guided-course/{slug}` (one placeholder), then you have one segment:

- **`route_params.segment_0`** – The first (and only) segment, e.g. `intro-to-js`.
- **`route_slug`** – Same value, e.g. `intro-to-js`.

Example:

```html
@set(course = getCourseBySlug(route_params.segment_0))
```

### Checking that segments exist

For non-wildcard URLs, `route_params` and `route_slug` are not set (or are null). You can guard your logic:

```html
@if(route_params and route_params.course)
  @set(course = getCourseBySlug(route_params.course))
  ...
@endif
```

---

## Examples

### One placeholder: “course by slug”

- **Page slug:** `app/guided-course/{slug}`
- **URLs:** `/app/guided-course/foundations`, `/app/guided-course/advanced`, …
- **In template:** `route_params.segment_0` or `route_slug` is the course slug (e.g. `foundations`). Pass it to `getCourseBySlug(route_params.segment_0)`.

### Two placeholders: “course + module”

- **Page slug:** `app/guided-courses/{course}/{module}`
- **URLs:** `/app/guided-courses/foundations/module-1`, …
- **In template:** `route_params.course`, `route_params.module`. Use `getCourseBySlug(route_params.course)` and then use `route_params.module` to pick the right module or lesson.

### More segments

You can use as many placeholders as you need, for example:

- **Page slug:** `learn/{topic}/{level}/{lesson}`
- **URL:** `/learn/javascript/beginner/01-variables`
- **In template:** `route_params.topic`, `route_params.level`, `route_params.lesson`.

---

## Tips

- **Placeholder names** – Use names that make sense in your template (e.g. `course`, `module`, `lesson`). They become the keys of `route_params`.
- **Same page, many URLs** – One page with a wildcard slug serves every matching URL; the content can change based on `route_params` and `route_slug`.
- **Multiple wildcard pages** – You can have several pages with different patterns (e.g. `app/guided-courses/{course}/{module}` and `app/workshops/{slug}`). Each pattern is matched separately; the right page is chosen by the URL.

---

## Summary

| You want… | Page slug (in app) | In template |
|-----------|---------------------|-------------|
| One segment (e.g. course slug) | `app/guided-course/{slug}` | `route_params.segment_0` or `route_slug` |
| Named segments (e.g. course + module) | `app/guided-courses/{course}/{module}` | `route_params.course`, `route_params.module` |
| Full remainder as one string | Any wildcard page | `route_slug` |

Use **`{name}`** in the slug for each dynamic part, then use **`route_params.name`** (or **`route_slug`**) in the template to drive your content and logic.
