# DeveloperCard Component

A modern, reusable card component that matches your dashboard's design system with glassmorphism effects, gradient backgrounds, and smooth animations.

## Features

- 🎨 **Glassmorphism Design** - Translucent backgrounds with blur effects
- 🌈 **Gradient Support** - Matches your existing CARD_BG color scheme
- ✨ **Smooth Animations** - Hover effects and micro-interactions
- 📱 **Responsive** - Works on all screen sizes
- ♿ **Accessible** - Proper focus states and ARIA support
- 🎯 **Role Badges** - Auto-generates abbreviations for different roles

## Usage

### Basic Usage

```jsx
import DeveloperCard from "./components/Cards/DeveloperCard";
import { CARD_BG } from "./utils/data";

function MyComponent() {
  return (
    <DeveloperCard
      role="Frontend Developer"
      technologies="React.js, DOM manipulation, CSS Flexbox"
      experience="2 Years"
      questions="10 Q&A"
      lastUpdated="30th Apr 2023"
      description="Preparing for product-based company interviews"
      bgColor={CARD_BG[0].bgColor}
      onCardClick={() => console.log("Card clicked")}
      onAddClick={() => console.log("Add clicked")}
    />
  );
}
```

### Integration with Existing Dashboard

```jsx
// In your Dashboard component
import DeveloperCard from "../../components/Cards/DeveloperCard";

// Replace or complement SummaryCard usage
<div className="sessions-grid">
  {sessions.map((session, index) => (
    <DeveloperCard
      key={session._id}
      role={session.role}
      technologies={session.topicsToFocus}
      experience={`${session.experience} Years`}
      questions={`${session.questions?.length || 0} Q&A`}
      lastUpdated={moment(session.updatedAt).format("Do MMM YYYY")}
      description={session.description}
      bgColor={CARD_BG[index % CARD_BG.length].bgColor}
      onCardClick={() => navigate(`/interview-prep/${session._id}`)}
      onAddClick={() => setOpenCreateModal(true)}
    />
  ))}
</div>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `role` | `string` | `"Frontend Developer"` | The job role/title |
| `technologies` | `string` | `"React.js, DOM manipulation, CSS Flexbox"` | Technologies or skills |
| `experience` | `string` | `"2 Years"` | Experience level |
| `questions` | `string` | `"10 Q&A"` | Number of questions available |
| `lastUpdated` | `string` | `"30th Apr 2023"` | Last update date |
| `description` | `string` | `"Preparing for..."` | Brief description |
| `bgColor` | `string` | `"linear-gradient(...)"` | Background gradient |
| `onCardClick` | `function` | `() => {}` | Handler for card click |
| `onAddClick` | `function` | `() => {}` | Handler for add button click |
| `className` | `string` | `""` | Additional CSS classes |

## Role Abbreviations

The component automatically generates role badges with abbreviations:

- Frontend Developer → **FD**
- Backend Developer → **BD**
- Full Stack Developer → **FS**
- Data Analyst → **DA**
- DevOps Engineer → **DE**
- UI/UX Designer → **UD**
- Mobile App Developer → **MA**
- AI/ML Engineer → **AE**
- Product Manager → **PM**

Custom roles will use the first letters of each word.

## Color Theming

The component automatically adapts badge colors based on the background:

- Green gradients → Green badges
- Yellow gradients → Orange badges  
- Blue gradients → Blue badges
- Red gradients → Red badges

## Demo

See `DeveloperCardDemo.jsx` for a complete example with all 9 role types from your dashboard image.

## File Structure

```
src/components/Cards/
├── DeveloperCard.jsx       # Main component
├── DeveloperCard.css       # Styling
├── DeveloperCardDemo.jsx   # Demo with examples
└── README.md              # This documentation
```

## Customization

The component uses CSS custom properties and follows your existing design patterns. You can customize:

1. **Colors**: Modify the gradient backgrounds in `utils/data.js`
2. **Spacing**: Adjust padding/margins in the CSS
3. **Animations**: Customize hover effects and transitions
4. **Responsive**: Update breakpoints for different layouts

## Browser Support

- Modern browsers with CSS Grid support
- Backdrop-filter support for glassmorphism effects
- CSS custom properties support