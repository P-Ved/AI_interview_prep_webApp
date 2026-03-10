import React from "react";
import DeveloperCard from "./DeveloperCard";
import { CARD_BG } from "../../utils/data";

const DeveloperCardDemo = () => {
  // Sample data matching the dashboard image
  const developerRoles = [
    {
      role: "Frontend Developer",
      technologies: "React.js, DOM manipulation, CSS Flexbox",
      experience: "2 Years",
      questions: "10 Q&A",
      lastUpdated: "30th Apr 2023",
      description: "Preparing for product-based company interviews",
      bgColor: "#ffffff"
    },
    {
      role: "Backend Developer",
      technologies: "Node.js, Express, REST APIs, MongoDB",
      experience: "3 Years",
      questions: "20 Q&A",
      lastUpdated: "1st May 2023",
      description: "Want to master backend system design and performance",
      bgColor: "#ffffff"
    },
    {
      role: "Full Stack Developer",
      technologies: "MERN stack, deployment strategies, authentication",
      experience: "4 Years",
      questions: "10 Q&A",
      lastUpdated: "30th Apr 2023",
      description: "Getting ready for startup tech rounds",
      bgColor: "#ffffff"
    },
    {
      role: "Data Analyst",
      technologies: "SQL, Excel, Data Visualization, Power BI",
      experience: "2 Years",
      questions: "10 Q&A",
      lastUpdated: "30th Apr 2023",
      description: "Targeting analyst roles in finance domain",
      bgColor: "#ffffff"
    },
    {
      role: "DevOps Engineer",
      technologies: "CI/CD, Docker, Kubernetes, AWS",
      experience: "5 Years",
      questions: "10 Q&A",
      lastUpdated: "30th Apr 2023",
      description: "Switching to a cloud-native role with more automation",
      bgColor: "#ffffff"
    },
    {
      role: "UI/UX Designer",
      technologies: "Figma, user journey, wireframing, accessibility",
      experience: "3 Years",
      questions: "10 Q&A",
      lastUpdated: "30th Apr 2023",
      description: "Preparing for top product design interviews",
      bgColor: "#ffffff"
    },
    {
      role: "Mobile App Developer",
      technologies: "React Native, Flutter, performance optimization",
      experience: "2 Years",
      questions: "10 Q&A",
      lastUpdated: "30th Apr 2023",
      description: "Need cross-platform expertise for startup interviews",
      bgColor: "#ffffff"
    },
    {
      role: "AI/ML Engineer",
      technologies: "Python, scikit-learn, model deployment, NLP",
      experience: "1 Year",
      questions: "10 Q&A",
      lastUpdated: "30th Apr 2023",
      description: "Cracking ML internship and entry-level roles",
      bgColor: "#ffffff"
    },
    {
      role: "Product Manager",
      technologies: "Roadmapping, user stories, KPIs, stakeholder communication",
      experience: "4 Years",
      questions: "10 Q&A",
      lastUpdated: "30th Apr 2023",
      description: "Pivoting into tech PM from business analyst background",
      bgColor: "#ffffff"
    }
  ];

  const handleCardClick = (role) => {
    console.log(`Clicked on ${role} card`);
    // You can navigate to interview prep page here
    // navigate(`/interview-prep/${sessionId}`);
  };

  const handleAddClick = (role) => {
    console.log(`Add clicked for ${role}`);
    // You can open create session modal here
    // setOpenCreateModal(true);
  };

  return (
    <div className="developer-cards-demo">
      <div className="demo-header">
        <h2 className="demo-title">Developer Role Cards</h2>
        <p className="demo-subtitle">Interactive cards showcasing different developer roles and interview preparation paths</p>
      </div>
      
      <div className="developer-cards-grid">
        {developerRoles.map((developer, index) => (
          <DeveloperCard
            key={index}
            role={developer.role}
            technologies={developer.technologies}
            experience={developer.experience}
            questions={developer.questions}
            lastUpdated={developer.lastUpdated}
            description={developer.description}
            bgColor={developer.bgColor}
            onCardClick={() => handleCardClick(developer.role)}
            onAddClick={() => handleAddClick(developer.role)}
          />
        ))}
      </div>
    </div>
  );
};

export default DeveloperCardDemo;