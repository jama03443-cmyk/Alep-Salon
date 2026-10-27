export const DEFAULT_LOYALTY_PROGRAM = {
  loyalty_visits_for_reward: 10,
  loyalty_reward_title: 'Votre {visits}e coupe offerte',
  loyalty_reward_description: 'À chaque visite avec une coupe, vos points sont ajoutés à votre carte numérique dans l’application Alep Salon. Tout est sur votre téléphone : pas de carte papier ni de tampons à garder.',
  loyalty_birthday_title: 'Cadeau d’anniversaire',
  loyalty_birthday_description: 'Pendant le mois de votre anniversaire, nous vous offrons une coupe. Une fois par an, si votre date de naissance est enregistrée chez nous.',
  loyalty_referral_title: 'Inviter des amis',
  loyalty_referral_description: 'Partagez votre lien personnel. Quand une nouvelle personne vient chez Alep et reçoit son premier point, vous recevez un point bonus sur votre carte numérique.',
  loyalty_review_title: 'Avis Google',
  loyalty_review_description: 'Pour votre avis Google sincère, vous recevez une seule fois un point bonus sur votre carte numérique.',
}

export const LOYALTY_PROGRAM_CARDS = [
  { titleKey: 'loyalty_reward_title', descriptionKey: 'loyalty_reward_description', icon: 'scissors' },
  { titleKey: 'loyalty_birthday_title', descriptionKey: 'loyalty_birthday_description', icon: 'gift' },
  { titleKey: 'loyalty_referral_title', descriptionKey: 'loyalty_referral_description', icon: 'friends' },
  { titleKey: 'loyalty_review_title', descriptionKey: 'loyalty_review_description', icon: 'star' },
]

const OLD_REWARD_DESCRIPTIONS = [
  'À chaque visite avec une coupe, l’équipe ajoute un tampon. Lorsque {stamps} tampons sont réunis, la coupe suivante est offerte.',
  'À chaque visite avec une coupe, l’équipe ajoute un tampon. Lorsque 9 tampons sont réunis, la coupe suivante est offerte.',
  'Cumulez vos points directement dans l’application Alep Salon : après {points} coupes, la {visits}e vous est offerte. Votre carte reste dans votre téléphone, sans carte ni tampon papier.',
  'Cumulez vos points avec l’application Alep Salon : après {points} coupes, la {visits}e vous est offerte. Votre carte reste dans votre téléphone, sans carte ni tampon papier.',
  'Cumulez vos points avec votre application Alep Salon : après {points} coupes, la {visits}e vous est offerte. Votre carte reste dans votre téléphone, sans carte ni tampon papier.',
]

export function getLoyaltyProgramSettings(data = {}) {
  const settings = { ...DEFAULT_LOYALTY_PROGRAM, ...data }
  if (OLD_REWARD_DESCRIPTIONS.includes(data.loyalty_reward_description)) {
    settings.loyalty_reward_description = DEFAULT_LOYALTY_PROGRAM.loyalty_reward_description
  }
  return settings
}
