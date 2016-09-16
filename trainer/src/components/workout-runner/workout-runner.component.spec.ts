import { inject, addProviders, fakeAsync, tick } from '@angular/core/testing';
import {Router} from '@angular/router';
import {Observable} from "rxjs/Rx";

import {WorkoutHistoryTracker} from '../../services/workout-history-tracker';
import {FinishComponent} from "../finish/finish.component";
import {WorkoutRunnerComponent} from './workout-runner.component';
import {WorkoutService} from '../../services/workout-service';
import {Exercise, WorkoutPlan, ExercisePlan} from "../../services/model";

class MockWorkoutHistoryTracker {
    startTracking() {}
    endTracking() {}
    exerciseComplete() {}
}

class MockWorkoutService {

    sampleWorkout = new WorkoutPlan(
         "testworkout",
         "Test Workout",
          40,
          [
              new ExercisePlan(new Exercise( "exercise1", "Exercise 1", "Exercise 1 description",  "/image1/path",  "audio1/path"), 50),
              new ExercisePlan(new Exercise( "exercise1", "Exercise 2", "Exercise 2 description",  "/image2/path",  "audio2/path"), 30),
              new ExercisePlan(new Exercise( "exercise1", "Exercise 3", "Exercise 3 description",  "/image3/path",  "audio3/path"), 20)
          ],
          "This is a test workout"
    );

    getWorkout(name: string) {
        return Observable.of(this.sampleWorkout);
    }
    totalWorkoutDuration(){
        return 180;
    };
}

export class MockRouter {
    navigate = jasmine.createSpy('navigate');
}

describe('Workout Runner', () =>{
    let component:any;
    let router:any;

    beforeEach(() =>{
        addProviders([
            WorkoutRunnerComponent,
            {provide: Router, useClass: MockRouter},
            {provide: WorkoutHistoryTracker ,useClass: MockWorkoutHistoryTracker},
            {provide: WorkoutService ,useClass: MockWorkoutService},
        ])
    });

    it('should load the Workout component', inject([WorkoutRunnerComponent], (runner: WorkoutRunnerComponent) => {
        expect(runner).toBeDefined();
    }));

    it('should start the workout', inject([WorkoutRunnerComponent, WorkoutService], (runner: WorkoutRunnerComponent, service: WorkoutService) => {
        runner.workoutStarted.subscribe((w: any) => {
            expect(w).toEqual(runner.workoutPlan);
        });
        runner.ngOnInit();
        runner.ngDoCheck();
        expect(runner.workoutTimeRemaining).toEqual(runner.workoutPlan.totalWorkoutDuration());
        expect(runner.workoutPaused).toBeFalsy();
    }));

    it('should start the first exercise', inject([WorkoutRunnerComponent], (runner: WorkoutRunnerComponent) => {
        spyOn(runner, 'startExercise').and.callThrough();
        runner.ngOnInit();
        runner.ngDoCheck();
        expect(runner.currentExerciseIndex).toEqual(0);
        expect(runner.startExercise).toHaveBeenCalledWith(runner.workoutPlan.exercises[runner.currentExerciseIndex]);
        expect(runner.currentExercise).toEqual(runner.workoutPlan.exercises[0]);
    }));

    it("should start history tracking", inject([WorkoutRunnerComponent, WorkoutHistoryTracker], (runner: WorkoutRunnerComponent, tracker: WorkoutHistoryTracker) => {
         spyOn(tracker, 'startTracking');
         runner.ngOnInit();
         runner.ngDoCheck();
         expect(tracker.startTracking).toHaveBeenCalled();
     }));

    it('should increase current exercise duration with time', inject([WorkoutRunnerComponent],<any>fakeAsync((runner: WorkoutRunnerComponent) => {
        runner.ngOnInit();
        runner.ngDoCheck();
        expect(runner.exerciseRunningDuration).toBe(0);
        tick(1000);
        expect(runner.exerciseRunningDuration).toBe(1);
        tick(1000);
        expect(runner.exerciseRunningDuration).toBe(2);
        TestHelper.advanceWorkout(7);
        expect(runner.exerciseRunningDuration).toBe(10);
        runner.ngOnDestroy();
    })));

    it("should decrease total workout duration with time", inject([WorkoutRunnerComponent],<any>fakeAsync((runner: WorkoutRunnerComponent) => {
        runner.ngOnInit();
        runner.ngDoCheck();
        expect(runner.workoutTimeRemaining).toBe(runner.workoutPlan.totalWorkoutDuration());
        tick(1000);
        expect(runner.workoutTimeRemaining).toBe(runner.workoutPlan.totalWorkoutDuration() - 1);
        tick(1000);
        expect(runner.workoutTimeRemaining).toBe(runner.workoutPlan.totalWorkoutDuration() - 2);
        runner.ngOnDestroy();
    })));

    it("should transition to next exercise on one exercise complete", inject([WorkoutRunnerComponent],<any>fakeAsync((runner: WorkoutRunnerComponent) => {
        runner.ngOnInit();
        runner.ngDoCheck();
        let exerciseDuration = runner.workoutPlan.exercises[0].duration;
        TestHelper.advanceWorkout(exerciseDuration);
        expect(runner.currentExercise.exercise.name).toBe('rest');
        expect(runner.currentExercise.duration).toBe(runner.workoutPlan.restBetweenExercise);
        runner.ngOnDestroy();
    })));

    it("should not update workoutTimeRemaining for paused workout on interval lapse", inject([WorkoutRunnerComponent],<any>fakeAsync((runner: WorkoutRunnerComponent) => {
        runner.ngOnInit();
        runner.ngDoCheck();
        expect(runner.workoutPaused).toBeFalsy();
        tick(1000);
        expect(runner.workoutTimeRemaining).toBe(runner.workoutPlan.totalWorkoutDuration() - 1);
        runner.pause();
        expect(runner.workoutPaused).toBe(true);
        tick(1000);
        expect(runner.workoutTimeRemaining).toBe(runner.workoutPlan.totalWorkoutDuration() - 1);
        runner.ngOnDestroy();
    })));

    it("should end the workout when all exercises are complete", inject([WorkoutRunnerComponent, WorkoutHistoryTracker, Router],<any>fakeAsync((runner: WorkoutRunnerComponent, tracker: WorkoutHistoryTracker, router:Router) =>  {
        spyOn(tracker, 'endTracking');
        runner.ngOnInit();
        runner.ngDoCheck();
        runner.workoutName = runner.workoutPlan.name;
        TestHelper.advanceWorkout(runner.workoutPlan.exercises[0].duration);
        TestHelper.advanceWorkout(runner.workoutPlan.restBetweenExercise);
        TestHelper.advanceWorkout(runner.workoutPlan.exercises[1].duration);
        TestHelper.advanceWorkout(runner.workoutPlan.restBetweenExercise);
        TestHelper.advanceWorkout(runner.workoutPlan.exercises[2].duration);

        expect(tracker.endTracking).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['finish', runner.workoutPlan.name]);
        expect(runner.workoutTimeRemaining).toBe(0);
        expect(runner.currentExercise).toBe(runner.workoutPlan.exercises[2]);
        runner.ngOnDestroy();
    })));

});

class TestHelper {
    static advanceWorkout(duration: number){
        for (var i= 0; i <= duration; i++){tick(1000)
    };
}
}
