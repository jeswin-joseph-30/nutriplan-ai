import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Coffee, Sun, Moon, Cookie, Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

interface Meal {
  type: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
}

const mealIcons: Record<string, any> = { breakfast: Coffee, lunch: Sun, dinner: Moon, snack: Cookie };

export default function MealPlan() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [generating, setGenerating] = useState(false);
  const [todayPlan, setTodayPlan] = useState<Tables<"meal_plans"> | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logMealType, setLogMealType] = useState("breakfast");
  const [logFoodName, setLogFoodName] = useState("");
  const [logCalories, setLogCalories] = useState("");

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("meal_plans").select("*").eq("user_id", user.id).eq("plan_date", today).order("created_at", { ascending: false }).limit(1),
    ]).then(([pRes, mpRes]) => {
      setProfile(pRes.data);
      if (mpRes.data?.[0]) {
        setTodayPlan(mpRes.data[0]);
        const planMeals = mpRes.data[0].meals as any;
        if (Array.isArray(planMeals)) setMeals(planMeals);
      }
    });
  }, [user]);

  const generate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          calorieTarget: profile?.daily_calorie_target || 2000,
          dietaryPreference: profile?.dietary_preference || "non_vegetarian",
          allergies: profile?.allergies || [],
          healthGoal: profile?.health_goal || "maintenance",
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const newMeals = data.meals || [];
      setMeals(newMeals);

      const today = new Date().toISOString().split("T")[0];
      await supabase.from("meal_plans").insert({
        user_id: user.id,
        plan_date: today,
        meals: newMeals,
        total_calories: data.totalCalories,
        total_protein: data.totalProtein,
        total_carbs: data.totalCarbs,
        total_fats: data.totalFats,
      });

      toast.success("Meal plan generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate meal plan");
    } finally {
      setGenerating(false);
    }
  };

  const logFood = async () => {
    if (!user || !logFoodName || !logCalories) return;
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("food_logs").insert({
      user_id: user.id,
      log_date: today,
      meal_type: logMealType,
      food_name: logFoodName,
      calories: parseInt(logCalories) || 0,
    });
    if (error) toast.error("Failed to log food");
    else { toast.success("Food logged!"); setLogOpen(false); setLogFoodName(""); setLogCalories(""); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meal Plan</h1>
          <p className="text-muted-foreground">Your personalized daily meals</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={logOpen} onOpenChange={setLogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1"><Plus className="h-4 w-4" /> Log Food</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Food</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Select value={logMealType} onValueChange={setLogMealType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Food Name</Label>
                  <Input value={logFoodName} onChange={e => setLogFoodName(e.target.value)} placeholder="e.g., Grilled chicken salad" />
                </div>
                <div className="space-y-2">
                  <Label>Calories</Label>
                  <Input type="number" value={logCalories} onChange={e => setLogCalories(e.target.value)} placeholder="e.g., 350" />
                </div>
                <Button onClick={logFood} className="w-full">Log Food</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={generate} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </Button>
        </div>
      </div>

      {meals.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No meal plan yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">Click "Generate" to create an AI-powered meal plan tailored to your goals</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meals.map((meal, i) => {
            const Icon = mealIcons[meal.type] || Coffee;
            return (
              <Card key={i} className="shadow-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{meal.name}</CardTitle>
                        <Badge variant="outline" className="mt-0.5 text-xs capitalize">{meal.type}</Badge>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-primary">{meal.calories} cal</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground mb-3">{meal.description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Protein: <strong className="text-foreground">{meal.protein}g</strong></span>
                    <span>Carbs: <strong className="text-foreground">{meal.carbs}g</strong></span>
                    <span>Fats: <strong className="text-foreground">{meal.fats}g</strong></span>
                  </div>
                  {meal.ingredients?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {meal.ingredients.map((ing, j) => (
                        <Badge key={j} variant="secondary" className="text-xs font-normal">{ing}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
