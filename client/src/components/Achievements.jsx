import PropTypes from 'prop-types';
import { Award, Footprints, Flame, Sparkles, Utensils, Train, Zap, ShieldCheck } from 'lucide-react';

const ALL_BADGES = [
  {
    id: 'first_step',
    name: 'First Step',
    description: 'Log your first carbon tracking activity to start your journey.',
    icon: <Footprints size={28} />,
    criteria: 'Logged 1+ activity of any category'
  },
  {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: 'Establish a consistent habit by maintaining a 3-day tracking streak.',
    icon: <Flame size={28} />,
    criteria: 'Reach a streak of 3 consecutive logging days'
  },
  {
    id: 'eco_warrior',
    name: 'Eco Warrior',
    description: 'Demonstrate long-term dedication by reaching a 7-day tracking streak.',
    icon: <Sparkles size={28} />,
    criteria: 'Reach a streak of 7 consecutive logging days'
  },
  {
    id: 'low_carbon_cook',
    name: 'Low Carbon Cook',
    description: 'Lower kitchen footprint by choosing low-carbon ingredients.',
    icon: <Utensils size={28} />,
    criteria: 'Log 3 vegetarian or vegan meals'
  },
  {
    id: 'commute_hero',
    name: 'Commute Hero',
    description: 'Avoid greenhouse gases by switching to shared public transit.',
    icon: <Train size={28} />,
    criteria: 'Log 5 bus or train transit activities'
  },
  {
    id: 'power_saver',
    name: 'Power Saver',
    description: 'Optimize household energy consumption and set active goals.',
    icon: <Zap size={28} />,
    criteria: 'Log electricity and plan a 15%+ weekly reduction in simulator'
  },
  {
    id: 'carbon_master',
    name: 'Carbon Master',
    description: 'Achieve significant, well-rounded tracking goals.',
    icon: <Award size={28} />,
    criteria: 'Log 10+ activities total and plan a 20%+ reduction'
  }
];

export default function Achievements({ user }) {
  const unlockedIds = user.badges || [];
  const unlockedCount = ALL_BADGES.filter(b => unlockedIds.includes(b.id)).length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Achievements Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Award size={28} style={{ color: 'hsl(var(--accent-gold))' }} aria-hidden="true" />
            Achievements Cabinet
          </h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>
            Unlocked badges representing your milestones in carbon footprint tracking and reduction.
          </p>
        </div>

        {/* Score box */}
        <div style={{
          background: 'linear-gradient(135deg, hsla(var(--accent-gold), 0.1), hsla(var(--accent-emerald), 0.1))',
          border: '1px solid hsl(var(--accent-gold))',
          padding: '8px 16px',
          borderRadius: 'var(--border-radius-sm)',
          fontWeight: '700',
          fontSize: '0.9rem'
        }}>
          🏆 {unlockedCount} / {ALL_BADGES.length} Badges Earned
        </div>
      </div>

      {/* Grid cabinet */}
      <div className="badge-grid">
        {ALL_BADGES.map(badge => {
          const isUnlocked = unlockedIds.includes(badge.id);
          return (
            <div 
              key={badge.id} 
              className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'} animate-fade-in`}
              style={{ justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="badge-icon-wrapper">
                  {badge.icon}
                </div>
                
                <h3 style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: '800', 
                  color: isUnlocked ? 'white' : 'hsl(var(--text-secondary))',
                  marginBottom: '8px'
                }}>
                  {badge.name}
                </h3>
                
                <p style={{ 
                  fontSize: '0.8rem', 
                  color: 'hsl(var(--text-secondary))', 
                  lineHeight: '1.4',
                  marginBottom: '12px'
                }}>
                  {badge.description}
                </p>
              </div>

              {/* Status footer */}
              <div style={{ 
                width: '100%', 
                borderTop: '1px solid hsla(var(--border-color), 0.5)', 
                paddingTop: '10px', 
                fontSize: '0.75rem', 
                color: isUnlocked ? 'hsl(var(--accent-emerald))' : 'hsl(var(--text-muted))',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                {isUnlocked ? (
                  <>
                    <ShieldCheck size={12} aria-hidden="true" />
                    Earned
                  </>
                ) : (
                  <span>Req: {badge.criteria}</span>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

Achievements.propTypes = {
  user: PropTypes.shape({
    badges: PropTypes.arrayOf(PropTypes.string)
  }).isRequired
};
