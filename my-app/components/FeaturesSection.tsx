import React from 'react';
import { motion } from 'framer-motion';
import styles from '../styles/FeaturesSection.module.css';

interface FeatureCard {
  icon: string;
  iconBg: string; // Hex color
  iconColor: string; // Hex color
  title: string;
  desc: string;
}

const features: FeatureCard[] = [
  {
    icon: "psychology",
    iconBg: "#dbeafe",
    iconColor: "#2563EB",
    title: "AI Mentorship",
    desc: "Get personalized guidance as you solve problems, with hints that nudge you without giving away the answer."
  },
  {
    icon: "terminal",
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    title: "DSA Roadmap",
    desc: "Master Arrays, Linked Lists, Trees, and Dynamic Programming with our curated path of 500+ problems."
  },
  {
    icon: "monitoring",
    iconBg: "#dcfce7",
    iconColor: "#16a34a",
    title: "In-depth Analytics",
    desc: "Track your progress with detailed reports on logic, communication, and code efficiency after every session."
  }
];


export default function FeaturesSection() {
  const titleText = "Everything you need to ace the tech loop";
  const words = titleText.split(" ");
  
  // Calculate global start index for each word to trigger continuous typing
  let charGlobalIndex = 0;
  const wordStartIndices = words.map(w => {
    const start = charGlobalIndex;
    charGlobalIndex += w.length + 1; // +1 to account for the space
    return start;
  });

  const typingSpeed = 0.04; 
  const totalTypingDuration = charGlobalIndex * typingSpeed;

  const cardsContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: totalTypingDuration + 0.3, // Wait for typing to finish
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 50, 
        damping: 20 
      }
    },
  };

  return (
    <>
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.headingBlock}>
            <h2 className={styles.title} aria-label={titleText}>
              {words.map((word, wordIndex) => (
                <span 
                  key={wordIndex} 
                  style={{ display: "inline-block", marginRight: "0.25em", whiteSpace: "nowrap" }}
                >
                  {word.split("").map((char, charIndex) => (
                    <motion.span
                      key={charIndex}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{
                        duration: 0,
                        delay: (wordStartIndices[wordIndex] + charIndex) * typingSpeed,
                      }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              ))}
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: [0, 1, 0] }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  repeatDelay: 0,
                  delay: totalTypingDuration, // Start blinking after typing? Or always blink? Usually blink during or after.
                  // Let's make it blink always, but maybe fade out after typing?
                  // User asked for "typing like", usually implies a cursor.
                }}
                style={{ 
                  display: 'inline-block', 
                  width: '2px', 
                  height: '1em', 
                  backgroundColor: 'var(--primary-color, #2563EB)', 
                  verticalAlign: 'middle',
                  marginLeft: '4px' 
                }}
              />
            </h2>
            <motion.p 
              className={styles.subtitle}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: totalTypingDuration + 0.1, duration: 0.5 }}
            >
              Built by engineers for engineers. Our platform simulates the exact
              conditions of modern technical interviews.
            </motion.p>
          </div>
          
          <motion.div 
            className={styles.grid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={cardsContainerVariants}
          >
            {features.map((feature, index) => {
              const isMiddle = index === 1;
              return (
                <motion.div 
                  key={index} 
                  className={styles.cardContainer}
                  variants={cardVariants as any}
                >
                   <div className={`${styles.card} ${isMiddle ? styles.cardElevated : ''}`}>
                      <div 
                        className={`${styles.iconChip} material-symbols-outlined`}
                        style={{ backgroundColor: feature.iconBg, color: feature.iconColor }}
                      >
                        {feature.icon}
                      </div>
                      <h3 className={styles.cardTitle}>{feature.title}</h3>
                      <p className={styles.cardDesc}>{feature.desc}</p>
                   </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
    </>
  );
}
