import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, MapPin, Clock, Users } from 'lucide-react';

const jobOpenings = [
  {
    id: 1,
    title: 'Livery Designer',
    type: 'Freelance',
    location: 'Remote',
    description: 'Create high-quality UK emergency service liveries for Roblox vehicles. Experience with Photoshop or similar required.',
    requirements: ['Proficient in Photoshop/GIMP', 'Knowledge of UK emergency services', 'Portfolio of previous work', 'Attention to detail'],
  },
  {
    id: 2,
    title: 'Lua Script Developer',
    type: 'Contract',
    location: 'Remote',
    description: 'Develop and maintain Lua scripts for Roblox roleplay servers. Focus on vehicle systems, MDT, and emergency services functionality.',
    requirements: ['Strong Lua programming skills', 'Experience with Roblox Studio', 'Understanding of FiveM/Roblox RP mechanics', 'Git version control'],
  },
  {
    id: 3,
    title: 'Community Moderator',
    type: 'Volunteer',
    location: 'Remote',
    description: 'Help maintain our Discord community, assist customers with questions, and ensure a positive environment for all members.',
    requirements: ['Active Discord presence', 'Excellent communication skills', 'Previous moderation experience', 'Availability across UK timezone'],
  },
  {
    id: 4,
    title: '3D Vehicle Modeler',
    type: 'Freelance',
    location: 'Remote',
    description: 'Create detailed 3D vehicle models optimized for Roblox. Focus on UK police, ambulance, and fire service vehicles.',
    requirements: ['Blender or Maya proficiency', 'Experience with low-poly modeling', 'Understanding of Roblox import requirements', 'Texture mapping skills'],
  },
];

export default function Jobs() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold gradient-text mb-4">
            Join Our Team
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're always looking for talented individuals to help create the best UK roleplay assets. 
            Check out our current opportunities below.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className="glass-card text-center">
            <CardContent className="pt-6">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">15+</p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </CardContent>
          </Card>
          <Card className="glass-card text-center">
            <CardContent className="pt-6">
              <Briefcase className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{jobOpenings.length}</p>
              <p className="text-sm text-muted-foreground">Open Positions</p>
            </CardContent>
          </Card>
          <Card className="glass-card text-center">
            <CardContent className="pt-6">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">100%</p>
              <p className="text-sm text-muted-foreground">Remote Work</p>
            </CardContent>
          </Card>
          <Card className="glass-card text-center">
            <CardContent className="pt-6">
              <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">Flexible</p>
              <p className="text-sm text-muted-foreground">Working Hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Job Listings */}
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold">Current Opportunities</h2>
          
          {jobOpenings.map((job) => (
            <Card key={job.id} className="glass-card hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                      <Badge variant="secondary">{job.type}</Badge>
                    </CardDescription>
                  </div>
                  <a 
                    href="https://discord.gg/d3Tq4KbNwq" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button className="gradient-button border-0">
                      Apply via Discord
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{job.description}</p>
                <div>
                  <p className="text-sm font-medium mb-2">Requirements:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {job.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Card className="glass-card mt-12 text-center">
          <CardContent className="py-8">
            <h3 className="font-display text-xl font-bold mb-2">Don't see a role that fits?</h3>
            <p className="text-muted-foreground mb-4">
              We're always interested in hearing from talented individuals. Join our Discord and introduce yourself!
            </p>
            <a 
              href="https://discord.gg/d3Tq4KbNwq" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline">Join Our Discord</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}