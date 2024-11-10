import { useEffect, useState } from 'react';

type Feature = {
  id: number;
  name: string;
  details: string;
};

type Data = {
  title: string;
  description: string;
  features: Feature[];
};

export default function Home() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch('/data.json')
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{data.title}</h1>
      <p style={styles.description}>{data.description}</p>
      <div style={styles.featureList}>
        {data.features.map((feature) => (
          <div key={feature.id} style={styles.featureCard}>
            <h2 style={styles.featureName}>{feature.name}</h2>
            <p style={styles.featureDetails}>{feature.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center' as const,
    padding: '20px',
    backgroundColor: '#f4f4f9',
    color: '#333',
  },
  title: {
    fontSize: '2.5em',
    color: '#333',
    marginBottom: '10px',
  },
  description: {
    fontSize: '1.2em',
    color: '#555',
    marginBottom: '20px',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: '15px',
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    padding: '15px 20px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'left' as const,
  },
  featureName: {
    fontSize: '1.5em',
    color: '#333',
  },
  featureDetails: {
    fontSize: '1em',
    color: '#666',
  },
};
