import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Flame, Drumstick, Wheat, Droplets, UtensilsCrossed, TrendingUp, User, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [todayLogs, setTodayLogs] = useState<Tables<"food_logs">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("food_logs").select("*").eq("user_id", user.id).eq("log_date", today),
    ]).then(([profileRes, logsRes]) => {
      setProfile(profileRes.data);
      setTodayLogs(logsRes.data || []);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalCals = todayLogs.reduce((sum, l) => sum + l.calories, 0);
  const totalProtein = todayLogs.reduce((sum, l) => sum + (l.protein || 0), 0);
  const totalCarbs = todayLogs.reduce((sum, l) => sum + (l.carbs || 0), 0);
  const totalFats = todayLogs.reduce((sum, l) => sum + (l.fats || 0), 0);
  const target = profile?.daily_calorie_target || 2000;
  const progress = Math.min((totalCals / target) * 100, 100);
  const needsSetup = !profile?.age;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
        </h1>
        <p className="text-muted-foreground">Here's your nutrition summary for today</p>
      </div>

      {needsSetup && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-foreground">Complete your profile</p>
              <p className="text-sm text-muted-foreground">Set up your health details to get personalized meal plans</p>
            </div>
            <Link to="/profile"><Button size="sm">Set Up</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Calorie ring */}
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center py-8">
          <div className="relative h-40 w-40">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-foreground">{totalCals}</span>
              <span className="text-xs text-muted-foreground">/ {target} cal</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Daily Calorie Progress</p>
        </CardContent>
      </Card>

      {/* Macro cards */}
      <div className="grid grid-cols-3 gap-3">
        <MacroCard icon={Drumstick} label="Protein" value={`${Math.round(totalProtein)}g`} color="text-info" />
        <MacroCard icon={Wheat} label="Carbs" value={`${Math.round(totalCarbs)}g`} color="text-accent" />
        <MacroCard icon={Droplets} label="Fats" value={`${Math.round(totalFats)}g`} color="text-warning" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/meal-plan">
          <Card className="shadow-card cursor-pointer transition-all hover:shadow-soft hover:-translate-y-0.5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
                <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Generate Plan</p>
                <p className="text-xs text-muted-foreground">AI meal plan</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/progress">
          <Card className="shadow-card cursor-pointer transition-all hover:shadow-soft hover:-translate-y-0.5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-accent">
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Track Progress</p>
                <p className="text-xs text-muted-foreground">Log weight</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function MacroCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col items-center p-4">
        <Icon className={`h-5 w-5 ${color} mb-1`} />
        <span className="text-lg font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
